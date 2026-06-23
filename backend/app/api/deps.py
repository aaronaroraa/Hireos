"""
Shared dependencies for all API routers.
Provides: DB session, authenticated user, role enforcement, tenant-scoped queries.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.session import get_db
from app.core.security import decode_token
from app.models.core import User

# ── Bearer token extractor ──
security_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Lightweight object representing the currently authenticated user."""

    def __init__(self, user_id: str, company_id: str, email: str, role: str):
        self.user_id = user_id
        self.company_id = company_id
        self.email = email
        self.role = role


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """
    Decode the JWT Bearer token and return the authenticated user.
    Raises 401 if the token is missing, expired, or invalid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Use an access token.",
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token.",
        )

    # Verify the user still exists in DB
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
        )

    return AuthenticatedUser(
        user_id=user.id,
        company_id=user.company_id,
        email=user.email,
        role=user.role,
    )


# ── Role-based access control ──
def require_role(allowed_roles: list[str]):
    """
    Dependency factory — restricts access to users with specific roles.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_role(["Admin"]))])
        def admin_endpoint(...):
    """

    def _role_checker(
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}. Your role: {current_user.role}.",
            )
        return current_user

    return _role_checker
