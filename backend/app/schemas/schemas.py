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
    is_active: bool = True
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
    payment_method: Optional[str] = None
    line_items: Optional[str] = None
    approval_level: Optional[str] = None
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    approver_name: Optional[str] = None
    approval_reason: Optional[str] = None

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
    match_status: str = "unmatched"  # matched | low_confidence | unmatched
    match_confidence: Optional[float] = None
    matched_receipt_id: Optional[UUID] = None

    model_config = {"from_attributes": True}


# ── Alerts ────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: UUID
    employee_id: Optional[UUID] = None
    receipt_id: Optional[UUID] = None
    alert_type: str
    description: str
    severity: str = "medium"
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
    monthly_budget: Optional[float] = None


class ActionTodayOut(BaseModel):
    receipts_pending_approval: int
    transactions_unmatched: int
    period_pending_employees: int
    period_pending_label: str  # "sin enviar recibos" | "sin revisar" | ""
    alerts_urgent: int
    period_id: Optional[UUID] = None
    period_status: Optional[str] = None  # "open" | "closed" | None


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


# ── Bank Import ────────────────────────────────────────────────────

class ImportPreviewRow(BaseModel):
    date: Optional[str] = None
    merchant: Optional[str] = None
    amount: Optional[float] = None
    reference: Optional[str] = None


class ImportPreviewResult(BaseModel):
    rows: list[ImportPreviewRow]
    total: int


class ImportResult(BaseModel):
    total_rows: int
    created: int
    skipped: int
    errors: list[str] = []


# ── Department Comparison ─────────────────────────────────────────

class DepartmentComparisonOut(BaseModel):
    department: str
    total_spending: float
    budget_total: float
    employee_count: int
    receipt_count: int
    utilization_pct: float
    top_category: Optional[str] = None


# ── AI Forecast ────────────────────────────────────────────────────

class MonthlyHistoryPoint(BaseModel):
    month: str
    total: float
    count: int


class ForecastOut(BaseModel):
    employee_id: str
    employee_name: str
    current_month_spending: float
    forecast_next_month: float
    trend: str
    confidence: str
    insight: str
    monthly_history: list[MonthlyHistoryPoint]
