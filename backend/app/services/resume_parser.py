import fitz  # PyMuPDF
import spacy
import re
from io import BytesIO

# Load lightweight spaCy English model for NER
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import spacy.cli
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

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

def extract_education(doc) -> str:
    """Use heuristic and NER to find education-related entities."""
    edu_keywords = ["university", "college", "institute", "bachelor", "master", "phd", "bsc", "msc"]
    for ent in doc.ents:
        if ent.label_ == "ORG":
            if any(keyword in ent.text.lower() for keyword in edu_keywords):
                return ent.text.strip()
    return "Not explicitly found"

def extract_experience_years(doc) -> float:
    """Estimate experience years by counting date entities (very rough proxy without LLM)."""
    # An LLM is required for highly accurate chronological mapping.
    # We fallback to a heuristic proxy based on DATE tags for now.
    dates = [ent.text for ent in doc.ents if ent.label_ == "DATE"]
    if len(dates) > 0:
        return round(float(len(dates)) * 0.5, 1)  # Heuristic mockup
    return 0.0

def parse_resume(pdf_bytes: bytes) -> dict:
    """
    Orchestrates the resume parsing pipeline:
    1. Extract plain text from PDF bytes.
    2. Run spaCy NLP processing on the text.
    3. Extract metadata natively.
    """
    raw_text = extract_text_from_pdf(pdf_bytes)
    
    # Process text using spaCy
    doc = nlp(raw_text)
    
    skills = extract_skills(raw_text)
    education = extract_education(doc)
    experience = extract_experience_years(doc)
    
    return {
        "extracted_skills": skills,
        "experience_years": experience,
        "education": education,
        "raw_text": raw_text[:500] + "..." # Snippet for sanity check
    }
