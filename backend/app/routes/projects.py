"""ExpensIQ — Projects (obras) routes."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Project
from app.schemas.schemas import ProjectCreate, ProjectOut, ProjectUpdate

logger = logging.getLogger("expensiq.projects")

router = APIRouter()


@router.get("", response_model=list[ProjectOut])
def list_projects(
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Project)
    if active_only:
        query = query.filter(Project.active == True)
    return query.order_by(Project.code.asc()).all()


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Project).filter(Project.code == body.code).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Ya existe una obra con código '{body.code}'")
    project = Project(
        id=uuid.uuid4(),
        code=body.code.strip(),
        name=body.name.strip(),
        description=body.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    logger.info("Project created: %s (%s)", project.code, project.id)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    if body.name is not None:
        project.name = body.name.strip()
    if body.description is not None:
        project.description = body.description
    if body.active is not None:
        project.active = body.active
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    # Soft-delete: mark inactive instead of removing (receipts may reference this project)
    project.active = False
    db.commit()
