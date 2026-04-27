"""ExpensIQ — Employee routes."""

import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Employee, Receipt
from app.schemas.schemas import (
    EmployeeCreate,
    EmployeeCategoryBreakdownOut,
    EmployeeDetailOut,
    EmployeeOut,
    EmployeeUpdate,
    ReceiptSummary,
)

router = APIRouter()

VALID_ROLES = {"employee", "admin", "viewer"}


@router.get("", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db)):
    return db.query(Employee).order_by(Employee.name).all()


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)):
    existing = db.query(Employee).filter(Employee.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    employee = Employee(
        name=payload.name,
        email=payload.email,
        department=payload.department,
        role=payload.role,
        monthly_budget=payload.monthly_budget,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.post("/bulk-import")
async def bulk_import_employees(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Accept a CSV file with columns: name,email,department,role,monthly_budget
    - Header row is required.
    - role defaults to 'employee' if missing or invalid.
    - monthly_budget is optional (defaults to null).
    - Rows where the email already exists are silently skipped.
    Returns: { created, skipped, errors }
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")  # handles BOM from Excel exports
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    required_headers = {"name", "email"}
    if reader.fieldnames is None or not required_headers.issubset(
        {h.strip().lower() for h in reader.fieldnames}
    ):
        raise HTTPException(
            status_code=400,
            detail="CSV must have a header row with at least 'name' and 'email' columns",
        )

    # Normalise header names to lowercase stripped versions
    reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]

    created = 0
    skipped = 0
    errors: list[str] = []

    for row_num, row in enumerate(reader, start=2):  # row 1 is the header
        name = (row.get("name") or "").strip()
        email = (row.get("email") or "").strip().lower()

        if not name or not email:
            errors.append(f"Row {row_num}: 'name' and 'email' are required")
            continue

        # Skip if email already registered
        if db.query(Employee).filter(Employee.email == email).first():
            skipped += 1
            continue

        role_raw = (row.get("role") or "").strip().lower()
        role = role_raw if role_raw in VALID_ROLES else "employee"

        department = (row.get("department") or "").strip() or None
        nif = (row.get("nif") or "").strip().upper() or None

        monthly_budget: float | None = None
        budget_raw = (row.get("monthly_budget") or "").strip()
        if budget_raw:
            try:
                monthly_budget = float(budget_raw.replace(",", "."))
            except ValueError:
                errors.append(
                    f"Row {row_num}: invalid monthly_budget value '{budget_raw}', ignored"
                )

        employee = Employee(
            name=name,
            email=email,
            department=department,
            role=role,
            monthly_budget=monthly_budget,
            nif=nif,
        )
        db.add(employee)
        created += 1

    db.commit()

    return {"created": created, "skipped": skipped, "errors": errors}


@router.get("/{employee_id}", response_model=EmployeeDetailOut)
def get_employee(employee_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    receipts = db.query(Receipt).filter(Receipt.employee_id == employee_id).all()

    total_spending = sum(float(r.amount or 0) for r in receipts)
    matched_count = sum(1 for r in receipts if r.status == "matched")
    pending_count = sum(1 for r in receipts if r.status in ("pending", "processing"))

    # Group by category
    categories: dict[str, list] = {}
    for r in receipts:
        cat = r.category or "other"
        categories.setdefault(cat, []).append(r)

    category_breakdown = [
        EmployeeCategoryBreakdownOut(
            category=cat,
            total_amount=sum(float(r.amount or 0) for r in cat_receipts),
            receipt_count=len(cat_receipts),
            receipts=[ReceiptSummary.model_validate(r) for r in cat_receipts],
        )
        for cat, cat_receipts in sorted(
            categories.items(),
            key=lambda x: sum(float(r.amount or 0) for r in x[1]),
            reverse=True,
        )
    ]

    return EmployeeDetailOut(
        id=employee.id,
        name=employee.name,
        email=employee.email,
        department=employee.department,
        role=employee.role,
        monthly_budget=float(employee.monthly_budget) if employee.monthly_budget else None,
        nif=employee.nif,
        created_at=employee.created_at,
        total_spending=total_spending,
        receipt_count=len(receipts),
        matched_count=matched_count,
        pending_count=pending_count,
        category_breakdown=category_breakdown,
    )


@router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(employee_id: str, payload: EmployeeUpdate, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "email" in update_data:
        existing = db.query(Employee).filter(
            Employee.email == update_data["email"], Employee.id != employee_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

    for field, value in update_data.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)
    return employee


@router.post("/{employee_id}/deactivate", response_model=EmployeeOut)
def deactivate_employee(employee_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee.is_active = False
    db.commit()
    db.refresh(employee)
    return employee


@router.post("/{employee_id}/activate", response_model=EmployeeOut)
def activate_employee(employee_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee.is_active = True
    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=204)
def delete_employee(employee_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(employee)
    db.commit()
    return Response(status_code=204)
