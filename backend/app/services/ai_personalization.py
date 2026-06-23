import json
import re
from openai import OpenAI
from app.core.config import settings

def _get_client() -> OpenAI | None:
    if not settings.OPENAI_API_KEY or "placeholder" in settings.OPENAI_API_KEY.lower():
        return None
    return OpenAI(api_key=settings.OPENAI_API_KEY)

def _sanitize(text: str, max_len: int = 500) -> str:
    if not text or not isinstance(text, str): return "N/A"
    return text[:max_len].strip() or "N/A"

def generate_personalized_assessment(candidate: dict, job_data: dict) -> dict:
    """
    Generates a deeply personalized coding challenge and interview questions based on 
    the candidate's specific background and the job requirements.
    
    Returns a dict with:
    {
       "assessment_config": {
           "time_limit_minutes": 45,
           "language": "python",
           "instructions": "..." 
       },
       "interview_questions": [
           "...", "...", "..."
       ]
    }
    """
    ai_client = _get_client()
    if not ai_client:
        # Fallback if no OpenAI key
        return _fallback_assessment(job_data)

    safe_title = _sanitize(job_data.get('title', ''), 200)
    safe_skills = _sanitize(', '.join(job_data.get('skills_required', [])), 300)
    safe_name = _sanitize(candidate.get('name', ''), 100)
    
    cand_skills_raw = candidate.get('skills', '')
    if isinstance(cand_skills_raw, list):
        safe_cand_skills = _sanitize(', '.join(cand_skills_raw), 300)
    else:
        safe_cand_skills = _sanitize(str(cand_skills_raw), 300)
        
    safe_exp = str(candidate.get('experience_years', 0))
    safe_edu = _sanitize(candidate.get('education', ''), 200)

    prompt = f"""
You are an expert technical interviewer hiring for: {safe_title}
Core Job Requirements: {safe_skills}

You are evaluating this specific candidate:
Name: {safe_name}
Candidate Background: {safe_exp} years experience, Education: {safe_edu}
Candidate's Extracted Skills: {safe_cand_skills}

TASK 1: Create a single, highly tailored browser-based coding assessment (algorithm/data structure/logic) that tests the intersection of THEIR strongest skills and OUR job requirements. The language should be Python. State the prompt simply.
TASK 2: Create exactly 3 customized interview questions that probe their specific background. For example, if they have 5 years of AWS experience, ask a deep architectural question about AWS.

Respond ONLY with valid JSON exactly matching this structure (no markdown fences, no formatting, just JSON):
{{
  "assessment_config": {{
    "time_limit_minutes": 45,
    "language": "python",
    "instructions": "<The coding challenge prompt text>"
  }},
  "interview_questions": [
    "<Question 1>",
    "<Question 2>",
    "<Question 3>"
  ]
}}
"""
    try:
        response = ai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=500,
        )
        
        result_text = response.choices[0].message.content.strip()
        
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
            result_text = result_text.strip()
            
        return json.loads(result_text)
        
    except Exception as e:
        print(f"AI Personalization Failed: {e}")
        return _fallback_assessment(job_data)


def _fallback_assessment(job_data: dict) -> dict:
    """Provides a safe default if the API fails or is missing"""
    return {
        "assessment_config": {
            "time_limit_minutes": 45,
            "language": "python",
            "instructions": f"Write a Python function representing a core component of this {job_data.get('title', 'Software')} role. You are evaluated on code quality and logic."
        },
        "interview_questions": [
            "Walk me through the most complex project you have built.",
            "Tell me about a time you solved a difficult technical bug under pressure.",
            "How do your past experiences align with the requirements of this role?"
        ]
    }
