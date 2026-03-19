"""ExpensIQ — Employee routes."""

from fastapi import APIRouter, Depends, HTTPException, Response
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


@router.get("/", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db)):
    return db.query(Employee).order_by(Employee.name).all()


@router.post("/", response_model=EmployeeOut, status_code=201)
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


@router.delete("/{employee_id}", status_code=204)
def delete_employee(employee_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(employee)
    db.commit()
    return Response(status_code=204)
