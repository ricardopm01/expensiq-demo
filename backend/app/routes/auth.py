"""ExpensIQ — Authentication routes (Google OAuth + JWT)."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import create_access_token, get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.models import Employee

logger = logging.getLogger("expensiq.auth")
router = APIRouter()


class GoogleTokenRequest(BaseModel):
    id_token: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee_id: str
    name: str
    email: str
    role: str


@router.post("/google", response_model=AuthResponse)
def login_with_google(body: GoogleTokenRequest, db: Session = Depends(get_db)):
    """Verify Google ID token, enforce @lezama.es domain, issue JWT."""
    try:
        google_info = id_token.verify_oauth2_token(
            body.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as e:
        logger.warning("Google token verification failed: %s", e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de Google inválido")

    email: str = google_info.get("email", "")
    domain = email.split("@")[-1] if "@" in email else ""

    if domain != settings.ALLOWED_DOMAIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Solo se permiten cuentas @{settings.ALLOWED_DOMAIN}",
        )

    google_id: str = google_info["sub"]
    name: str = google_info.get("name", email.split("@")[0])

    # Find or create employee
    employee = db.query(Employee).filter(Employee.email == email).first()
    if not employee:
        # Auto-provision: new employee with role=employee by default
        employee = Employee(
            name=name,
            email=email,
            google_id=google_id,
            role="employee",
            is_active=True,
        )
        db.add(employee)
        logger.info("Auto-provisioned new employee: %s", email)
    else:
        if not employee.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada")
        employee.google_id = google_id

    employee.last_login = datetime.utcnow()
    db.commit()
    db.refresh(employee)

    token = create_access_token(str(employee.id), employee.email, employee.role)

    return AuthResponse(
        access_token=token,
        employee_id=str(employee.id),
        name=employee.name,
        email=employee.email,
        role=employee.role,
    )


@router.get("/me")
def get_me(current_user: Employee = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "department": current_user.department,
    }


@router.post("/logout")
def logout():
    # JWT is stateless — client just discards the token
    return {"status": "ok"}


class DevLoginRequest(BaseModel):
    email: str
    role: str = "employee"


@router.post("/dev-login", response_model=AuthResponse)
def dev_login(body: DevLoginRequest, db: Session = Depends(get_db)):
    """DEV ONLY — login without Google. Disabled in production."""
    import os
    if os.getenv("DEV_MODE", "false").lower() != "true":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if not body.email.endswith(f"@{settings.ALLOWED_DOMAIN}"):
        raise HTTPException(status_code=400, detail=f"Email must be @{settings.ALLOWED_DOMAIN}")

    employee = db.query(Employee).filter(Employee.email == body.email).first()
    if not employee:
        employee = Employee(
            name=body.email.split("@")[0].replace(".", " ").title(),
            email=body.email,
            role=body.role,
            is_active=True,
        )
        db.add(employee)

    employee.last_login = datetime.utcnow()
    db.commit()
    db.refresh(employee)

    token = create_access_token(str(employee.id), employee.email, employee.role)
    return AuthResponse(
        access_token=token,
        employee_id=str(employee.id),
        name=employee.name,
        email=employee.email,
        role=employee.role,
    )
