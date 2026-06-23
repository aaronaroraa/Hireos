"""
AI Assessment Generator — Creates personalized, tailored coding challenges
for candidates based on their resume profile and the target job description.

Uses OpenAI ChatCompletion (JSON mode) to generate unique challenges
that test skills relevant to both the candidate's background and the role.
"""
import json
import logging
from typing import Optional
from openai import OpenAI, APIError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client (lazy — only connects when called)
_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


SYSTEM_PROMPT = """You are an expert technical interviewer and assessment designer for a Fortune 500 recruitment platform.

Your task is to generate a personalized, practical coding challenge that:
1. Is directly relevant to the JOB DESCRIPTION provided.
2. Tests the specific SKILLS the candidate claims on their resume — but pushes them slightly beyond surface-level.
3. Is completable in 30-45 minutes by a competent developer.
4. Includes clear instructions, constraints, and a Python starter template.

RULES:
- The challenge must be UNIQUE and SPECIFIC — never generic "FizzBuzz" or "reverse a string".
- Tie the challenge to a realistic business scenario related to the job.
- The starter code should compile/run as-is (with placeholder logic).
- Include 2-3 hidden evaluation criteria that test deeper understanding.

You MUST respond with valid JSON matching this exact schema:
{
    "title": "string — A compelling, specific title for the challenge",
    "instructions": "string — Detailed markdown instructions (problem statement, constraints, examples)",
    "initial_code": "string — Python starter template with docstrings and function signatures",
    "skills_tested": ["string array — The specific skills this challenge evaluates"],
    "difficulty": "string — 'junior', 'mid', or 'senior'",
    "estimated_minutes": 30,
    "evaluation_criteria": ["string array — What the AI scorer should look for"]
}"""


def _build_user_prompt(
    candidate_name: str,
    candidate_skills: list[str],
    candidate_experience: Optional[str],
    candidate_education: Optional[str],
    job_title: str,
    job_description: str,
    job_skills_required: list[str],
) -> str:
    """Construct the user prompt from candidate + job data."""

    skills_str = ", ".join(candidate_skills) if candidate_skills else "Not specified"
    job_skills_str = ", ".join(job_skills_required) if job_skills_required else "Not specified"

    return f"""Generate a personalized coding assessment for this candidate and role:

## CANDIDATE PROFILE
- **Name**: {candidate_name}
- **Skills**: {skills_str}
- **Experience**: {candidate_experience or 'Not specified'}
- **Education**: {candidate_education or 'Not specified'}

## TARGET ROLE
- **Job Title**: {job_title}
- **Description**: {job_description or 'No description provided'}
- **Required Skills**: {job_skills_str}

Create a challenge that bridges what the candidate knows with what the role demands. 
If the candidate has frontend skills but the role is backend, test their ability to adapt.
If they're a perfect match, push them with an advanced scenario."""


async def generate_tailored_challenge(
    candidate_name: str,
    candidate_skills: list[str],
    candidate_experience: Optional[str],
    candidate_education: Optional[str],
    job_title: str,
    job_description: str,
    job_skills_required: list[str],
) -> dict:
    """
    Call OpenAI to generate a unique, personalized coding challenge.
    
    Returns a dict with: title, instructions, initial_code, skills_tested, 
    difficulty, estimated_minutes, evaluation_criteria
    
    Falls back to a sensible default challenge if the API call fails.
    """
    try:
        client = _get_client()
        user_prompt = _build_user_prompt(
            candidate_name=candidate_name,
            candidate_skills=candidate_skills,
            candidate_experience=candidate_experience,
            candidate_education=candidate_education,
            job_title=job_title,
            job_description=job_description,
            job_skills_required=job_skills_required,
        )

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=2000,
        )

        raw = response.choices[0].message.content
        challenge = json.loads(raw)

        # Validate required fields exist
        required_keys = ["title", "instructions", "initial_code", "skills_tested"]
        for key in required_keys:
            if key not in challenge:
                raise ValueError(f"Missing required field in AI response: {key}")

        logger.info(f"Generated tailored challenge: {challenge['title']} for {candidate_name}")
        return challenge

    except (APIError, json.JSONDecodeError, ValueError) as e:
        logger.error(f"AI challenge generation failed: {e}")
        return _fallback_challenge(candidate_name, job_title, candidate_skills)

    except Exception as e:
        logger.error(f"Unexpected error in AI challenge generation: {e}")
        return _fallback_challenge(candidate_name, job_title, candidate_skills)


def _fallback_challenge(
    candidate_name: str,
    job_title: str,
    skills: list[str],
) -> dict:
    """
    Generate a reasonable default challenge when AI is unavailable.
    This ensures candidates can still take an assessment even if OpenAI is down.
    """
    skills_str = ", ".join(skills[:5]) if skills else "Python, problem-solving"

    return {
        "title": f"Technical Assessment — {job_title}",
        "instructions": f"""# Technical Assessment for {job_title}

## Problem Statement

You are building a **data processing pipeline** for a growing startup. 
Your task is to implement a system that processes a stream of records, 
applies transformations, and outputs aggregated results.

## Requirements

1. **Parse** the input data (a list of dictionaries).
2. **Filter** records based on configurable criteria.
3. **Transform** the data by computing derived fields.
4. **Aggregate** results into a summary report.

## Constraints

- Use only Python standard library (no external packages).
- Your solution should handle edge cases (empty input, malformed data).
- Write clean, well-documented code with type hints.

## Evaluation Criteria

- Correctness and completeness of the solution
- Code quality, structure, and readability
- Error handling and edge case coverage
- Demonstrated knowledge of: {skills_str}

## Example

```python
input_data = [
    {{"name": "Alice", "score": 85, "department": "Engineering"}},
    {{"name": "Bob", "score": 92, "department": "Engineering"}},
    {{"name": "Charlie", "score": 78, "department": "Marketing"}},
]

# Expected output: aggregated stats per department
```
""",
        "initial_code": f'''"""
Technical Assessment — {job_title}
Candidate: {candidate_name}

Implement the DataPipeline class below.
"""


class DataPipeline:
    """A configurable data processing pipeline."""

    def __init__(self, config: dict = None):
        """Initialize pipeline with optional configuration."""
        self.config = config or {{}}
        self.records = []

    def ingest(self, data: list[dict]) -> "DataPipeline":
        """Load raw records into the pipeline."""
        # TODO: Implement data ingestion with validation
        pass

    def filter_by(self, field: str, condition: callable) -> "DataPipeline":
        """Filter records where condition(record[field]) is True."""
        # TODO: Implement filtering logic
        pass

    def transform(self, field: str, func: callable) -> "DataPipeline":
        """Apply a transformation function to a specific field."""
        # TODO: Implement transformation logic
        pass

    def aggregate(self, group_by: str, metric_field: str) -> dict:
        """Aggregate records by a field and compute stats on metric_field."""
        # TODO: Implement aggregation (count, avg, min, max per group)
        pass

    def execute(self) -> list[dict]:
        """Return the processed records."""
        return self.records


# ── Test your implementation ──
if __name__ == "__main__":
    sample_data = [
        {{"name": "Alice", "score": 85, "department": "Engineering"}},
        {{"name": "Bob", "score": 92, "department": "Engineering"}},
        {{"name": "Charlie", "score": 78, "department": "Marketing"}},
        {{"name": "Diana", "score": 95, "department": "Engineering"}},
        {{"name": "Eve", "score": 88, "department": "Marketing"}},
    ]

    pipeline = DataPipeline()
    result = pipeline.ingest(sample_data).filter_by("score", lambda x: x > 80).execute()
    print("Filtered:", result)

    stats = pipeline.ingest(sample_data).aggregate("department", "score")
    print("Aggregated:", stats)
''',
        "skills_tested": skills[:5] if skills else ["Python", "Data Processing", "OOP"],
        "difficulty": "mid",
        "estimated_minutes": 35,
        "evaluation_criteria": [
            "Correct implementation of all pipeline methods",
            "Proper error handling for edge cases",
            "Clean code structure with type hints and docstrings",
        ],
    }
