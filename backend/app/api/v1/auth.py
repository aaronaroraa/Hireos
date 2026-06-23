"""
Auth API — registration, login, token refresh.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.session import get_db
from app.models.core import User, Company
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, UserForgotPassword
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter()


# ── Password validation ──
def _validate_password(password: str) -> None:
    """Enforce password complexity: min 8 chars, mixed case, digit."""
    errors = []
    if len(password) < 8:
        errors.append("at least 8 characters")
    if not any(c.isupper() for c in password):
        errors.append("an uppercase letter")
    if not any(c.islower() for c in password):
        errors.append("a lowercase letter")
    if not any(c.isdigit() for c in password):
        errors.append("a digit")
    if errors:
        raise HTTPException(
            status_code=400,
            detail=f"Password must contain: {', '.join(errors)}.",
        )


@router.post("/register", response_model=UserResponse)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    _validate_password(user_in.password)

    # Create Company + User in one transaction
    new_company = Company(name=user_in.company_name)
    db.add(new_company)
    db.flush()  # Get company ID without committing

    new_user = User(
        company_id=new_company.id,
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role="Admin",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login")
def login_user(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token_data = {
        "sub": user.email,
        "user_id": user.id,
        "company_id": user.company_id,
        "role": user.role,
    }

    return {
        "access_token": create_access_token(data=token_data),
        "refresh_token": create_refresh_token(data=token_data),
        "token_type": "bearer",
    }


@router.post("/refresh")
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not a refresh token.",
        )

    # Verify user still exists
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")

    new_token_data = {
        "sub": user.email,
        "user_id": user.id,
        "company_id": user.company_id,
        "role": user.role,
    }

    return {
        "access_token": create_access_token(data=new_token_data),
        "token_type": "bearer",
    }


@router.post("/forgot-password")
def forgot_password(payload: UserForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": "If that email is in our database, we have sent a password reset link."}
    
    from datetime import timedelta
    reset_token = create_access_token(data={"sub": user.email, "type": "reset"}, expires_delta=timedelta(minutes=15))
    
    print(f"\n{'='*50}")
    print(f"MOCK EMAIL DISPATCHED TO: {user.email}")
    print(f"SUBJECT: Password Reset Request")
    print(f"BODY:\nTo reset your password, please click the link below within 15 minutes:")
    print(f"http://localhost:5173/reset-password?token={reset_token}")
    print(f"{'='*50}\n")
    
    return {"message": "If that email is in our database, we have sent a password reset link."}


@router.post("/demo-login")
def demo_login(db: Session = Depends(get_db)):
    """
    One-click demo access. Auto-creates a demo company + user if they
    don't exist, then returns a valid JWT token pair.
    No password required — perfect for portfolio demos.
    """
    from fastapi.responses import JSONResponse
    import traceback
    try:
        DEMO_EMAIL = "demo@recruitmentos.ai"
        DEMO_NAME = "Demo Admin"
        DEMO_COMPANY = "Acme Corp (Demo)"

        # Find or create the demo user
        user = db.query(User).filter(User.email == DEMO_EMAIL).first()

        if not user:
            # Create demo company
            demo_company = Company(name=DEMO_COMPANY)
            db.add(demo_company)
            db.flush()

            # Create demo user with a random hashed password (never used)
            user = User(
                company_id=demo_company.id,
                name=DEMO_NAME,
                email=DEMO_EMAIL,
                password_hash=get_password_hash("DemoMode!SecureRandom#2026"),
                role="Admin",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token_data = {
            "sub": user.email,
            "user_id": user.id,
            "company_id": user.company_id,
            "role": user.role,
        }

        return {
            "access_token": create_access_token(data=token_data),
            "refresh_token": create_refresh_token(data=token_data),
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "company_id": user.company_id,
                "role": user.role,
            },
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Demo Login Failed: {str(e)}",
                "traceback": traceback.format_exc()
            }
        )

