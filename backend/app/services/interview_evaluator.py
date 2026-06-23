"""
Interview answer evaluator.
Scores the candidate's answers against the questions using GPT.
Returns a score (0-100), a candidate-facing feedback paragraph,
and an internal recruiter note with a recommendation.
"""
import json
import re
from openai import OpenAI
from app.core.config import settings


def _client() -> OpenAI | None:
    if not settings.OPENAI_API_KEY or "placeholder" in settings.OPENAI_API_KEY.lower():
        return None
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def _sanitize(text: str, max_len: int = 300) -> str:
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text or '')
    return text[:max_len].strip()


def evaluate_interview(
    qa_pairs: list[dict],  # [{"question": "...", "answer": "...", "skipped": bool}]
    job_title: str,
    candidate_name: str,
) -> dict:
    """
    Evaluate a completed interview.
    Returns:
        {
            "score": 0-100,
            "feedback": "candidate-facing paragraph",
            "reasoning": "internal recruiter notes",
            "recommendation": "advance" | "reject",
            "question_scores": [{"question": "...", "score": 0-10, "note": "..."}]
        }
    """
    client = _client()
    if not client:
        return _rule_based_evaluate(qa_pairs)

    safe_title = _sanitize(job_title, 200)
    safe_name = _sanitize(candidate_name, 100)

    # Build QA summary, sanitizing each answer
    qa_text = ""
    for i, pair in enumerate(qa_pairs, 1):
        q = _sanitize(pair.get("question", ""), 300)
        a = _sanitize(pair.get("answer", ""), 500)
        skipped = pair.get("skipped", False)
        qa_text += f"\nQ{i} [{pair.get('section', 'General')}]: {q}\n"
        qa_text += f"A{i}: {'[SKIPPED]' if skipped else a}\n"

    try:
        response = _client().chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior hiring manager evaluating a candidate interview for a tech company. "
                        "Score each answer honestly. Skipped questions score 0. "
                        "Return ONLY a valid JSON object with these exact keys: "
                        '"score" (integer 0-100 overall), '
                        '"feedback" (2-3 sentence professional paragraph FOR THE CANDIDATE — encouraging but honest, no score mentioned), '
                        '"reasoning" (3-4 sentences of INTERNAL notes for the recruiter — specific, critical, actionable), '
                        '"recommendation" ("advance" or "reject"), '
                        '"question_scores" (array of {"question": str, "score": 0-10, "note": str}). '
                        "Do NOT mention the numeric score in the candidate feedback."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Role: {safe_title}\nCandidate: {safe_name}\n\n"
                        f"Interview transcript:\n{qa_text}"
                    ),
                },
            ],
            temperature=0.4,
            max_tokens=1200,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```[a-z]*\n?', '', raw).rstrip('`').strip()
        result = json.loads(raw)
        return {
            "score": max(0, min(100, int(result.get("score", 50)))),
            "feedback": str(result.get("feedback", "Thank you for completing the interview."))[:600],
            "reasoning": str(result.get("reasoning", ""))[:800],
            "recommendation": result.get("recommendation", "reject"),
            "question_scores": result.get("question_scores", []),
        }
    except Exception as e:
        print(f"[interview_evaluator] GPT failed: {e}")
        return _rule_based_evaluate(qa_pairs)


def evaluate_chat_transcript(
    transcript: list[dict],  # [{"role": "agent"|"candidate", "content": "..."}]
    job_title: str,
    candidate_name: str,
) -> dict:
    """
    Evaluate a conversational interview transcript.
    Same return shape as evaluate_interview.
    """
    client = _client()
    candidate_turns = [t for t in transcript if t.get("role") == "candidate"]
    if not client:
        return _rule_based_chat(candidate_turns)

    safe_title = _sanitize(job_title, 200)
    safe_name = _sanitize(candidate_name, 100)

    convo = ""
    for t in transcript:
        who = "Interviewer" if t.get("role") == "agent" else candidate_name
        convo += f"\n{who}: {_sanitize(t.get('content', ''), 600)}"

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior hiring manager reviewing a first-round chat interview transcript. "
                        "Assess depth of answers, technical substance, communication, and signal of competence. "
                        "Return ONLY valid JSON with keys: "
                        '"score" (integer 0-100), '
                        '"feedback" (2-3 sentence professional paragraph FOR THE CANDIDATE, encouraging but honest, no score), '
                        '"reasoning" (3-4 sentences INTERNAL notes for the recruiter — specific and critical), '
                        '"recommendation" ("advance" or "reject"). '
                        "Do not mention the numeric score in the candidate feedback."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Role: {safe_title}\nCandidate: {safe_name}\n\nTranscript:{convo}",
                },
            ],
            temperature=0.4,
            max_tokens=900,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```[a-z]*\n?', '', raw).rstrip('`').strip()
        result = json.loads(raw)
        return {
            "score": max(0, min(100, int(result.get("score", 50)))),
            "feedback": str(result.get("feedback", "Thank you for the conversation."))[:600],
            "reasoning": str(result.get("reasoning", ""))[:800],
            "recommendation": result.get("recommendation", "reject"),
            "question_scores": [],
        }
    except Exception as e:
        print(f"[interview_evaluator] chat eval failed: {e}")
        return _rule_based_chat(candidate_turns)


def _rule_based_chat(candidate_turns: list[dict]) -> dict:
    substantive = sum(1 for t in candidate_turns if len(t.get("content", "").strip()) > 40)
    score = min(85, 35 + substantive * 7)
    return {
        "score": score,
        "feedback": (
            "Thank you for the conversation — we enjoyed learning about your background. "
            "Our team will review and be in touch shortly with next steps."
        ),
        "reasoning": f"Candidate gave {substantive} substantive answers across {len(candidate_turns)} turns. "
                     "Rule-based score (AI unavailable).",
        "recommendation": "advance" if score >= 55 else "reject",
        "question_scores": [],
    }


def _rule_based_evaluate(qa_pairs: list[dict]) -> dict:
    total = len(qa_pairs)
    answered = sum(1 for p in qa_pairs if not p.get("skipped") and len(p.get("answer", "").strip()) > 20)
    ratio = answered / max(total, 1)
    score = int(ratio * 70) + 10  # 10-80 range for rule-based

    return {
        "score": score,
        "feedback": (
            "Thank you for completing the interview. We've reviewed your responses "
            "and will be in touch shortly with next steps."
        ),
        "reasoning": f"Candidate answered {answered}/{total} questions. Rule-based score (AI unavailable).",
        "recommendation": "advance" if score >= 50 else "reject",
        "question_scores": [],
    }
