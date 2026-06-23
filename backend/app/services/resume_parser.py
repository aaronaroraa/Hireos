import fitz  # PyMuPDF
import re
from io import BytesIO

KNOWN_SKILLS = {
    "python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go",
    "rust", "swift", "kotlin", "php", "sql", "nosql", "postgresql", "mysql",
    "mongodb", "redis", "docker", "kubernetes", "aws", "azure", "gcp",
    "react", "angular", "vue", "django", "flask", "fastapi", "spring",
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
    "git", "ci/cd", "linux", "agile", "scrum"
}

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF file using PyMuPDF."""
    text = ""
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text

def extract_skills(text: str) -> list[str]:
    """Find known tech skills in the text."""
    found_skills = set()
    words = set(re.findall(r'[a-zA-Z\+\-\#\/\.]{2,}', text.lower()))
    
    for word in words:
        if word in KNOWN_SKILLS:
            found_skills.add(word)
            
    # Also check multi-word skills
    for skill in KNOWN_SKILLS:
        if " " in skill and skill in text.lower():
            found_skills.add(skill)
            
    return sorted(list(found_skills))

def extract_education(text: str) -> str:
    """Use regex to find education-related information."""
    edu_keywords = [
        r"university", r"college", r"institute", r"bachelor", r"master",
        r"phd", r"bsc", r"msc", r"b\.tech", r"m\.tech", r"b\.e\.", r"m\.e\.",
        r"b\.sc", r"m\.sc", r"mba", r"bba", r"diploma"
    ]
    pattern = re.compile(
        r'(?:.*(?:' + '|'.join(edu_keywords) + r').*)',
        re.IGNORECASE
    )
    matches = pattern.findall(text)
    if matches:
        # Return the first meaningful match, cleaned up
        return matches[0].strip()[:200]
    return "Not explicitly found"

def extract_experience_years(text: str) -> float:
    """Estimate experience years from text using regex patterns."""
    # Look for patterns like "5 years", "3+ years", "5 yrs"
    patterns = [
        r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)?',
        r'experience\s*(?:of)?\s*(\d+)\+?\s*(?:years?|yrs?)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))
    
    # Fallback: count year mentions as a rough proxy
    year_matches = re.findall(r'\b20[0-2]\d\b', text)
    if len(year_matches) >= 2:
        years = sorted([int(y) for y in year_matches])
        return float(years[-1] - years[0])
    
    return 0.0

def parse_resume(pdf_bytes: bytes) -> dict:
    """
    Orchestrates the resume parsing pipeline:
    1. Extract plain text from PDF bytes.
    2. Extract metadata using regex patterns.
    """
    raw_text = extract_text_from_pdf(pdf_bytes)
    
    skills = extract_skills(raw_text)
    education = extract_education(raw_text)
    experience = extract_experience_years(raw_text)
    
    return {
        "extracted_skills": skills,
        "experience_years": experience,
        "education": education,
        "raw_text": raw_text[:500] + "..."  # Snippet for sanity check
    }
