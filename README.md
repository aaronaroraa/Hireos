# Recruitment OS 🚀

Recruitment OS is a full-stack, AI-powered recruitment automation platform designed to handle the complete hiring lifecycle. It eliminates manual HR screening by automatically parsing resumes, scoring candidates with AI, and conducting technical assessments in a browser-based sandbox.

## ✨ Core Features
- **🤖 AI Job Descriptions:** Instantly generate professional JDs based on core requirements using OpenAI.
- **📄 Intelligent Resume Parsing:** Automatically extract skills, experience, and education from PDF resumes using PyMuPDF and spaCy NLP.
- **⚡ Bulk Hiring Engine:** Upload spreadsheets (CSV/Excel) of up to 1,000 candidates. The AI engine automatically scores each candidate against job requirements and auto-shortlists the top tier.
- **💻 Auto-Assessments:** Shortlisted candidates automatically receive unique links to a browser-based technical coding sandbox. Their code is securely executed, evaluated, and graded instantly.
- **📋 Dynamic Kanban Pipeline:** Track candidates visually across all stages (Applied → Screening → Assessment → Interview → Offer → Rejected).

## 🛠 Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend:** Python, FastAPI, SQLAlchemy, Uvicorn
- **AI & NLP:** OpenAI GPT-3.5 API, PyMuPDF, spaCy
- **Database:** SQLite (local) / PostgreSQL (production ready)
- **Security:** JWT Authentication, bcrypt, strict CORS rules
