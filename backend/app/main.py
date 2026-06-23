"""
Recruitment OS — FastAPI Application Entry Point.
Production-grade setup: CORS whitelist, rate limiting, structured error handling.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn

from app.core.config import settings
from app.api.v1 import auth, jobs, resumes, assessments, candidates, bulk_upload, candidate_portal
from app.db.session import engine, Base
from app.models import core, assessments as assessment_models, candidate
from app.models import campaign as campaign_model
from app.models import notification as notification_model

# ── Create tables ──
Base.metadata.create_all(bind=engine)

# ── Rate Limiter ──
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])

# ── App ──
app = FastAPI(
    title="Recruitment OS API",
    version="1.0.0",
    description="AI-Powered Recruitment Automation Platform",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS (whitelist from config, not "*") ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions — never leak stack traces to client."""
    if settings.DEBUG:
        return JSONResponse(status_code=500, content={"detail": str(exc)})
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})

# ── Routers ──
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(resumes.router, prefix="/api/v1/resumes", tags=["resumes"])
app.include_router(assessments.router, prefix="/api/v1/assessments", tags=["assessments"])
app.include_router(candidates.router, prefix="/api/v1/candidates", tags=["candidates"])
app.include_router(bulk_upload.router, prefix="/api/v1/bulk", tags=["bulk"])
app.include_router(candidate_portal.router, prefix="/api/v1/portal", tags=["portal"])

# ── Health checks ──
@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}

@app.get("/health/ready")
def readiness_check():
    """Deep health check — verifies DB connectivity."""
    from sqlalchemy import text
    from app.db.session import SessionLocal
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ready", "database": "ok"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "unhealthy", "database": str(e)})


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
