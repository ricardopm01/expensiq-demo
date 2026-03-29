"""ExpensIQ — JWT authentication middleware."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.models import Employee

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(employee_id: str, email: str, role: str) -> str:
    payload = {
        "sub": employee_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Employee:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticación requerida")

    payload = decode_token(credentials.credentials)
    employee_id = payload.get("sub")

    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.is_active == True,
    ).first()

    if not employee:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado o inactivo")

    return employee


async def require_admin(current_user: Employee = Depends(get_current_user)) -> Employee:
    if current_user.role not in ("admin", "viewer"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso restringido a administradores")
    return current_user


async def require_full_admin(current_user: Employee = Depends(get_current_user)) -> Employee:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso restringido al administrador")
    return current_user
