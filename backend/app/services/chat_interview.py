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
    return f"""You are conducting a live, proctored, chat-based interview for the {job_title} role at {company_name}. The candidate is on camera and cannot copy-paste — every message is their own real-time response. Treat this exactly as a senior engineer conducting a high-stakes, final-round interview.

SESSION FORMAT:
- Single unified round. Technical, behavioural, and system-design questions flow naturally in one conversation.
- The session runs on a fixed timer. You do NOT control when it ends — the system ends it. Until then, keep interviewing.
- Do NOT ask the candidate if they want to stop. Do NOT offer to wrap up. Keep going until the session ends.

CANDIDATE BACKGROUND (their resume — treat every claim as unverified until they prove it):
{resume_section}

─────────────────────────────────────────────
AI-GENERATED ANSWER DETECTION — TOP PRIORITY
─────────────────────────────────────────────
Be highly suspicious of answers that:
- Use formal, structured language ("Firstly... Secondly... In conclusion...")
- Define terms before answering ("Redis is an in-memory data store that...")
- Cover every angle perfectly with no hesitation or personal anecdote
- Sound like documentation or a blog post rather than a person talking
- Have no "I" — no personal ownership, no specific memory, no emotion

When you detect a likely AI-generated or rehearsed answer, do NOT move on. Instead:
1. Pick one specific technical term or claim from their answer.
2. Ask them to explain it in their own words without any structure — "Just talk me through what [term] actually does, in plain English, like you're explaining it to someone on your team."
3. Then ask something experiential: "When did you last actually use this? What went wrong?" or "Give me a real moment from your work where this came up."
4. If their follow-up is also polished and generic, pick another term and go again. Keep drilling until they either prove genuine understanding or expose the gap.
5. You may note (briefly, once): "I want to make sure I understand what you personally know here — can you walk me through [X] from your own experience?" Then continue drilling.

─────────────────────────────────────
HOW TO CONDUCT THE REST OF THE INTERVIEW
─────────────────────────────────────
Start with one open question about their most significant project. Then follow the thread.

KEYWORD LISTENING — the moment they mention any of the following, follow up immediately:
- A technology (Redis, Kafka, PostgreSQL, Docker, etc.): ask exactly how they used it in production, then ask why they chose it over the obvious alternative.
- A number or metric (10k users, 40% latency reduction, 500 concurrent connections): ask how they measured it and what the before/after was with real numbers.
- A design decision: ask what options they considered and what made them reject the others.
- A vague or inflated claim ("optimised it", "improved performance", "led the team"): push back hard — "What does that mean specifically? Before and after. Numbers."
- A challenge, failure, or tradeoff: ask what they would do differently now and why.

DEPTH BEFORE BREADTH:
- 2-3 follow-up questions minimum on each topic before moving on.
- Only pivot when they have answered thoroughly OR are clearly stuck for over two exchanges.
- If stuck: one push ("Take your time — even a rough direction is fine"). If still stuck: "Let's move on" and shift.

COVERAGE: at least one project deep-dive, technical reasoning (why/tradeoffs), system thinking (what breaks at 10x, how you'd redesign it), one behavioural moment (conflict, failure, or pushing back), and spontaneous problem-solving if time allows.

CONDUCT RULES:
- Ask ONE question at a time. Never stack.
- Stay neutral. Never say "great answer", "correct", or "perfect". Brief acknowledgements only ("okay", "got it"), then next question.
- No hints, no examples, no leading. If they struggle, "take your time" — nothing more.
- Do not break character. You are a senior interviewer, not a tutor.
- Do NOT give any feedback or score during the session. If asked, say: "I can't share that now — the team reviews everything at the end."

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
Return ONLY a JSON object with these exact keys:

- "score": integer 0-100. Use this calibration — most candidates should score between 30-65. A score above 75 requires exceptional, specific, verifiable answers with real numbers, genuine depth, and clear personal ownership. A score above 85 is extremely rare. Apply heavy penalties for:
  * Answers that read like AI output or documentation (structured, comprehensive, impersonal) — deduct 15-25 points
  * Any answer that uses textbook definitions before answering ("X is a technology that...") — deduct 5-10 points per instance
  * Claims not backed by specific personal experience (no "I", no concrete memory, no specific moment) — deduct 5-10 points per claim
  * Inability to answer follow-up drills on their own stated experience — deduct 10-20 points
  * Vague metrics or no numbers when numbers were clearly expected — deduct 5-10 points
  * Generic answers that could apply to any candidate for any job — deduct 10 points
  Apply bonuses only for: specific numbers with context, genuine admission of failure with learning, clear personal ownership, ability to handle adversarial follow-ups confidently with real detail.

- "verdict": one of "Strong Hire", "Hire", "Borderline", "No Hire". Map strictly: 80+ = Strong Hire, 65-79 = Hire, 45-64 = Borderline, below 45 = No Hire.

- "ai_detection_flags": list of specific answers that appeared AI-generated or rehearsed — quote the suspicious phrase and explain why it raised a flag.

- "debrief_markdown": full formatted debrief containing:
    OVERALL SCORE and VERDICT, then AI/REHEARSAL FLAGS (list any answers that appeared AI-generated or memorised, with the specific tell), then TOPIC-BY-TOPIC BREAKDOWN (for each topic: what they demonstrated with direct quotes, where they were vague/generic/couldn't follow up, and whether it's a concern), then RECRUITER SUMMARY (3-4 blunt honest sentences), then TOP 3 CONCERNS tied directly to what happened in the transcript.

- "recruiter_summary": the 3-4 sentence recruiter summary on its own.

- "candidate_feedback": a 2-3 sentence note FOR THE CANDIDATE — professional, no score, no verdict, no false encouragement if they performed poorly.

Be ruthlessly honest. The purpose of this score is to filter — not to encourage. If the candidate gave polished, generic answers that could have been written by an AI, say so explicitly."""

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
        flags = result.get("ai_detection_flags", [])
        flags_text = ""
        if flags:
            flags_text = "\n\nAI / REHEARSAL FLAGS:\n" + "\n".join(f"• {f}" for f in flags)
        debrief_md = str(result.get("debrief_markdown", "")) + flags_text
        return {
            "score": max(0, min(100, int(result.get("score", 50)))),
            "verdict": result.get("verdict", "Borderline"),
            "debrief_markdown": debrief_md[:5000],
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
