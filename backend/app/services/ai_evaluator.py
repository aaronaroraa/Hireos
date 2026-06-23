"""
AI Job Description Generator.
Uses OpenAI to generate professional job descriptions.
"""
from openai import OpenAI
from app.core.config import settings


def _get_client() -> OpenAI | None:
    """Lazy-initialize OpenAI client from centralized config."""
    if not settings.OPENAI_API_KEY or "placeholder" in settings.OPENAI_API_KEY.lower():
        return None
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def generate_job_description(title: str, skills: list[str]) -> str:
    """Generate a professional markdown job description using OpenAI."""
    client = _get_client()

    if not client:
        # Mock fallback
        skills_str = ", ".join(skills)
        return (
            f"**Job Title**: {title}\n\n"
            f"**About the Role**: We are looking for an experienced {title}.\n\n"
            f"**Required Skills**: {skills_str}\n\n"
            f"**Responsibilities**:\n"
            f"- Develop high-quality software.\n"
            f"- Collaborate with cross-functional teams.\n"
            f"- Mentor junior developers."
        )

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a professional HR recruiter assistant."},
            {"role": "user", "content": (
                f"Create a professional, engaging job description in Markdown for:\n"
                f"Job Title: {title}\n"
                f"Required Skills: {', '.join(skills)}\n\n"
                f"Include: About the Role, Responsibilities, Required Qualifications, "
                f"Preferred Qualifications, Compensation Range (Estimated)"
            )},
        ],
        temperature=0.7,
        max_tokens=800,
    )

    return response.choices[0].message.content.strip()
