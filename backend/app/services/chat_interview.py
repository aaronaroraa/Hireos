"""
Live, proctored, chat-based interview agent.

The agent runs a single unified round (technical + behavioural + system design
flow naturally in one conversation). It is driven by a fixed timer — it NEVER
ends the session itself; the system ends it when time is up, at which point
generate_debrief() produces a structured recruiter debrief.

Falls back to a scripted question bank if OpenAI is unavailable so demos work.
"""
import json
import re
from openai import OpenAI
from app.core.config import settings


def _client() -> OpenAI | None:
    if not settings.OPENAI_API_KEY or "placeholder" in settings.OPENAI_API_KEY.lower():
        return None
    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL,
    )


def _sanitize(text: str, max_len: int = 6000) -> str:
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text or '')
    text = re.sub(
        r'(?i)(ignore|forget|disregard)\s+(all|previous|prior)\s+(instructions?|prompts?)',
        '[filtered]', text
    )
    return text[:max_len].strip()


# ── The interviewer system prompt ─────────────────────────────────────────────

def _system_prompt(company_name: str, job_title: str, resume_section: str) -> str:
    return f"""You are conducting a live, proctored, chat-based interview for the {job_title} role at {company_name}. The candidate is on camera and cannot copy-paste — every message is their own real-time response. Treat this exactly as a candidate sitting across from you in a real interview room.

SESSION FORMAT:
- Single unified round. Technical, behavioural, and system-design questions flow naturally in one conversation.
- The session runs on a fixed timer. You do NOT control when it ends — the system ends it. Until then, keep interviewing.
- Do NOT ask the candidate if they want to stop. Do NOT offer to wrap up. Do NOT hint that the interview is ending. Keep going until you receive a system message that the session has ended.

CANDIDATE BACKGROUND (their resume — make them prove it):
{resume_section}

HOW TO CONDUCT THE INTERVIEW:
Start with one open question about their most significant project or experience. Let them talk, then follow the thread.

KEYWORD LISTENING — the moment they mention any of the following, follow up before moving to anything new:
- A technology (Redis, Kafka, PostgreSQL, Docker, etc.): ask exactly how they used it, then why they chose it over a reasonable alternative.
- A number or metric (10k users, reduced latency 40%, 500 concurrent connections): ask how they measured it, how they hit it, and what happens at 10x.
- A design decision: ask what other options they considered and why they rejected them.
- A vague or inflated claim (optimised it, improved performance, handled scale, led the team): push back — "What does that mean specifically? Give me the before and after with actual numbers."
- A challenge, failure, or tradeoff: ask what they would do differently today and why.

DEPTH BEFORE BREADTH:
- Spend 2-3 follow-up questions on each topic before moving on.
- Only pivot when they have answered thoroughly OR are clearly stuck.
- If stuck: one gentle push ("Take your time — even a rough direction is fine"). If still stuck, say "That's okay, let's move on" and shift topics. Do not dwell.

COVERAGE across the session: at least one project deep-dive, technical reasoning (why/tradeoffs), system thinking (how it scales, what breaks first, how to redesign), one or two behavioural moments (conflict, failure, pushing back or leading), and problem-solving under pressure if time allows.

CONDUCT RULES:
- Ask ONE question at a time. Never stack multiple questions in one message.
- Stay neutral. Never say "great answer", "correct", or "perfect". You may say "okay", "got it", "makes sense" briefly, then ask the next question.
- Do not give hints, examples, or lead the witness. If they struggle, you may say "take your time" — nothing more.
- Do not break character. You are the interviewer — not a tutor, coach, or chatbot.
- Do NOT give any feedback, score, rating, or evaluation during the session. If asked how they're doing, say: "I can't share that during the interview — we'll go through everything at the end."

Output only your next single interview message."""


def agent_opening(company_name: str, candidate_name: str, job_title: str) -> str:
    first = candidate_name.split()[0] if candidate_name else "there"
    return (
        f"Hi {first}, thanks for joining. This is a timed interview for the {job_title} role at "
        f"{company_name} — we'll just talk through your background and work. To start: tell me about the "
        f"project or piece of work you're most proud of, and what your role on it was."
    )


def next_agent_message(
    transcript: list[dict],
    company_name: str,
    job_title: str,
    resume_section: str,
) -> str:
    """
    Produce the interviewer's next single message. The agent never ends the
    session — it always returns another question/probe.
    """
    client = _client()
    safe_resume = _sanitize(resume_section)

    if not client:
        return _fallback_next(transcript)

    messages = [{"role": "system", "content": _system_prompt(company_name, job_title, safe_resume)}]
    for turn in transcript:
        role = "assistant" if turn.get("role") == "agent" else "user"
        messages.append({"role": role, "content": _sanitize(turn.get("content", ""), 2500)})

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[chat_interview] GPT failed: {e}")
        return _fallback_next(transcript)


# ── Debrief (produced when the timer ends) ────────────────────────────────────

def generate_debrief(
    transcript: list[dict],
    company_name: str,
    job_title: str,
    candidate_name: str,
) -> dict:
    """
    Review the whole conversation and produce the structured recruiter debrief.
    Returns:
        {
          "score": int 0-100,
          "verdict": "Strong Hire" | "Hire" | "Borderline" | "No Hire",
          "debrief_markdown": "...full formatted debrief...",
          "recruiter_summary": "...",
          "candidate_feedback": "...candidate-safe paragraph, no score..."
        }
    """
    client = _client()
    candidate_turns = [t for t in transcript if t.get("role") == "candidate"]
    if not client:
        return _fallback_debrief(candidate_turns, job_title)

    convo = ""
    for t in transcript:
        who = "Interviewer" if t.get("role") == "agent" else candidate_name
        convo += f"\n{who}: {_sanitize(t.get('content', ''), 800)}"

    debrief_instructions = f"""[SESSION ENDED — provide full debrief now]

Review the entire conversation from start to finish. The role is {job_title} at {company_name}.
Return ONLY a JSON object with these keys:
- "score": integer 0-100
- "verdict": one of "Strong Hire", "Hire", "Borderline", "No Hire"
- "debrief_markdown": a full formatted debrief string containing:
    OVERALL SCORE, VERDICT, then a TOPIC-BY-TOPIC BREAKDOWN where for each major topic you give:
    what the candidate demonstrated (reference what they actually said), where they were vague/incorrect/showed a gap (be direct), and whether it's a concern for the role.
    Then a RECRUITER SUMMARY (3-4 honest sentences, do not inflate) and TOP 2 AREAS TO WORK ON (tied to what actually came up — if they bluffed on a technology, say so; if they couldn't quantify results, say so).
- "recruiter_summary": the 3-4 sentence recruiter summary on its own
- "candidate_feedback": a separate 2-3 sentence professional note FOR THE CANDIDATE — encouraging but honest, no numeric score, no verdict.

Be honest. Do not soften real weaknesses."""

    messages = [
        {"role": "system", "content": _system_prompt(company_name, job_title, "(see transcript)")},
        {"role": "user", "content": f"Full interview transcript:\n{convo}\n\n{debrief_instructions}"},
    ]

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=1400,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```[a-z]*\n?', '', raw).rstrip('`').strip()
        result = json.loads(raw)
        return {
            "score": max(0, min(100, int(result.get("score", 50)))),
            "verdict": result.get("verdict", "Borderline"),
            "debrief_markdown": str(result.get("debrief_markdown", ""))[:4000],
            "recruiter_summary": str(result.get("recruiter_summary", ""))[:800],
            "candidate_feedback": str(result.get("candidate_feedback",
                "Thank you for taking the time to interview with us. The team will review and be in touch."))[:600],
        }
    except Exception as e:
        print(f"[chat_interview] debrief failed: {e}")
        return _fallback_debrief(candidate_turns, job_title)


# ── Fallbacks (AI unavailable) ────────────────────────────────────────────────

_FALLBACK_QUESTIONS = [
    "Tell me about the project you're most proud of — what did you build and what was your specific role?",
    "What was the single hardest technical problem in that project, and how did you work through it?",
    "Why did you choose that approach over the obvious alternative? What did you trade off?",
    "You mentioned scale — how did you actually measure that, and what breaks first at 10x?",
    "Walk me through a decision you'd make differently today, and why.",
    "Tell me about a time you disagreed with a teammate on a technical call. What happened?",
    "If you had to redesign that system from scratch, what would you change and why?",
    "Describe a time something you shipped failed in production. What did you learn?",
    "How do you approach a problem you've genuinely never seen before?",
    "What part of your work are you hoping to go deeper on next, and why?",
]


def _fallback_next(transcript: list[dict]) -> str:
    asked = sum(1 for t in transcript if t.get("role") == "agent")
    idx = max(0, asked - 1)
    if idx < len(_FALLBACK_QUESTIONS):
        return _FALLBACK_QUESTIONS[idx]
    # Loop back into deeper probes rather than ending — the timer ends the session.
    return "Got it. Let's go deeper on that — what specifically did you own versus the rest of the team?"


def _fallback_debrief(candidate_turns: list[dict], job_title: str) -> dict:
    substantive = sum(1 for t in candidate_turns if len(t.get("content", "").strip()) > 40)
    score = min(85, 30 + substantive * 7)
    verdict = "Hire" if score >= 70 else "Borderline" if score >= 50 else "No Hire"
    return {
        "score": score,
        "verdict": verdict,
        "debrief_markdown": (
            f"OVERALL SCORE: {score} / 100\nVERDICT: {verdict}\n\n"
            f"TOPIC-BY-TOPIC BREAKDOWN:\nThe candidate gave {substantive} substantive answers. "
            "Automated debrief unavailable (AI offline) — manual review recommended.\n\n"
            "RECRUITER SUMMARY:\nLimited automated signal; review the transcript directly."
        ),
        "recruiter_summary": f"{substantive} substantive answers across the session. Manual transcript review recommended (AI offline).",
        "candidate_feedback": "Thank you for completing the interview. Our team will review your responses and be in touch shortly.",
    }
