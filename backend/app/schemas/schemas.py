"""ExpensIQ — Pydantic schemas for API request/response models."""

from datetime import date as DateType, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


# ── Employees ─────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    name: str
    email: str
    department: Optional[str] = None
    role: str = "employee"
    monthly_budget: Optional[float] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    monthly_budget: Optional[float] = None


class EmployeeOut(BaseModel):
    id: UUID
    name: str
    email: str
    department: Optional[str] = None
    role: str
    monthly_budget: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Receipts ──────────────────────────────────────────────────────

class ReceiptOut(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    upload_timestamp: Optional[datetime] = None
    image_url: Optional[str] = None
    merchant: Optional[str] = None
    date: Optional[DateType] = None
    amount: Optional[float] = None
    currency: str = "EUR"
    tax: Optional[float] = None
    category: str = "other"
    status: str = "pending"
    ocr_confidence: Optional[float] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Bank Transactions ─────────────────────────────────────────────

class TransactionOut(BaseModel):
    id: UUID
    employee_id: Optional[UUID] = None
    external_id: Optional[str] = None
    date: DateType
    merchant: Optional[str] = None
    amount: float
    currency: str = "EUR"
    account_id: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Alerts ────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: UUID
    employee_id: Optional[UUID] = None
    receipt_id: Optional[UUID] = None
    alert_type: str
    description: str
    is_read: bool = False
    resolved: bool = False
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Analytics ─────────────────────────────────────────────────────

class SummaryOut(BaseModel):
    total_spending: float
    receipt_count: int
    matched_count: int
    open_alert_count: int
    flagged_count: int
    transaction_count: int
    unmatched_txn_count: int
    review_count: int
    pending_count: int


class CategoryOut(BaseModel):
    category: str
    total_amount: float


class TopSpenderOut(BaseModel):
    employee_id: UUID
    name: str
    department: Optional[str] = None
    total_month: float
    receipt_count: int


# ── Action Results ────────────────────────────────────────────────

class SyncResult(BaseModel):
    created: int
    skipped: int


class ReconcileResult(BaseModel):
    receipts_processed: int
    matches_created: int
    alerts_created: int


class ReconcileSingleResult(BaseModel):
    status: str
    matches_created: int


# ── Employee Detail & Drill-Down ─────────────────────────────────

class ReceiptSummary(BaseModel):
    id: UUID
    merchant: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[DateType] = None
    status: str = "pending"
    currency: str = "EUR"
    ocr_confidence: Optional[float] = None

    model_config = {"from_attributes": True}


class EmployeeCategoryBreakdownOut(BaseModel):
    category: str
    total_amount: float
    receipt_count: int
    receipts: list[ReceiptSummary]


class EmployeeDetailOut(BaseModel):
    id: UUID
    name: str
    email: str
    department: Optional[str] = None
    role: str
    monthly_budget: Optional[float] = None
    created_at: Optional[datetime] = None
    total_spending: float = 0.0
    receipt_count: int = 0
    matched_count: int = 0
    pending_count: int = 0
    category_breakdown: list[EmployeeCategoryBreakdownOut] = []

    model_config = {"from_attributes": True}


# ── Receipt Update (Fase 2) ──────────────────────────────────────

class ReceiptUpdate(BaseModel):
    merchant: Optional[str] = None
    date: Optional[DateType] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    tax: Optional[float] = None
    category: Optional[str] = None
    notes: Optional[str] = None


class ApproveRejectResult(BaseModel):
    status: str
    message: str


# ── Receipt Match Detail ─────────────────────────────────────────

class ReceiptMatchOut(BaseModel):
    match_id: UUID
    transaction_id: UUID
    confidence: Optional[float] = None
    match_method: Optional[str] = None
    transaction_date: DateType
    transaction_merchant: Optional[str] = None
    transaction_amount: float
    transaction_currency: str = "EUR"
