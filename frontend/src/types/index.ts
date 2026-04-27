// ExpensIQ TypeScript types — mirrors backend Pydantic schemas

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: string;
  monthly_budget: number | null;
  nif: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string | null;
}

export interface Receipt {
  id: string;
  employee_id: string;
  employee_name: string | null;
  upload_timestamp: string | null;
  image_url: string | null;
  merchant: string | null;
  date: string | null;
  amount: number | null;
  currency: string;
  tax: number | null;
  // IVA breakdown (Sprint 3)
  tax_base: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  category: string;
  status: string;
  ocr_confidence: number | null;
  notes: string | null;
  payment_method: string | null;
  line_items: string | null;
  approval_level: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approver_name: string | null;
  approval_reason: string | null;
  // Obra (Sprint 3)
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
}

export interface ApprovalSummary {
  pending_auto: number;
  pending_manager: number;
  pending_director: number;
  // Legacy bucket: manager + director + any pre-Sprint-1 "admin" rows
  pending_admin: number;
  approved_today: number;
}

export interface MonthlyTrend {
  month: string;
  total: number;
  count: number;
}

export interface ApproveRejectResult {
  status: string;
  message: string;
}

export interface Transaction {
  id: string;
  employee_id: string | null;
  external_id: string | null;
  date: string;
  merchant: string | null;
  amount: number;
  currency: string;
  account_id: string | null;
  match_status: 'matched' | 'low_confidence' | 'unmatched';
  match_confidence: number | null;
  matched_receipt_id: string | null;
}

export interface ActionToday {
  receipts_pending_approval: number;
  transactions_unmatched: number;
  period_pending_employees: number;
  period_pending_label: string;
  alerts_urgent: number;
  period_id: string | null;
  period_status: 'open' | 'closed' | null;
}

export interface Alert {
  id: string;
  employee_id: string | null;
  receipt_id: string | null;
  alert_type: string;
  description: string;
  severity: string;
  suggested_action?: string | null;
  is_read: boolean;
  resolved: boolean;
  created_at: string | null;
  resolved_at: string | null;
}

export interface AutoReady {
  count: number;
  total_amount_eur: number;
  receipt_ids: string[];
}

export interface Summary {
  total_spending: number;
  receipt_count: number;
  matched_count: number;
  open_alert_count: number;
  flagged_count: number;
  transaction_count: number;
  unmatched_txn_count: number;
  review_count: number;
  pending_count: number;
}

export interface CategoryBreakdown {
  category: string;
  total_amount: number;
}

export interface TopSpender {
  employee_id: string;
  name: string;
  department: string | null;
  total_month: number;
  receipt_count: number;
  monthly_budget: number | null;
}

export interface ReceiptSummary {
  id: string;
  merchant: string | null;
  amount: number | null;
  date: string | null;
  status: string;
  currency: string;
  ocr_confidence: number | null;
}

export interface EmployeeCategoryBreakdown {
  category: string;
  total_amount: number;
  receipt_count: number;
  receipts: ReceiptSummary[];
}

export interface EmployeeDetail extends Employee {
  total_spending: number;
  receipt_count: number;
  matched_count: number;
  pending_count: number;
  category_breakdown: EmployeeCategoryBreakdown[];
}

export interface ReceiptMatch {
  match_id: string;
  transaction_id: string;
  confidence: number | null;
  match_method: string | null;
  transaction_date: string;
  transaction_merchant: string | null;
  transaction_amount: number;
  transaction_currency: string;
}

// Lookup maps
export const CATEGORY_LABEL: Record<string, string> = {
  transport: 'Transporte',
  meals: 'Comidas',
  lodging: 'Alojamiento',
  supplies: 'Material',
  entertainment: 'Entretenimiento',
  utilities: 'Servicios',
  other: 'Otros',
};

export const CATEGORY_COLOR: Record<string, string> = {
  transport: '#6366F1',
  meals: '#F59E0B',
  lodging: '#10B981',
  supplies: '#3B82F6',
  entertainment: '#EC4899',
  utilities: '#8B5CF6',
  other: '#94A3B8',
};

export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:    { label: 'Pendiente',  bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400'   },
  processing: { label: 'Procesando', bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-400'    },
  approved:   { label: 'Aprobado',   bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  matched:    { label: 'Conciliado', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  review:     { label: 'Revisar',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  flagged:    { label: 'Marcado',    bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500'     },
  rejected:   { label: 'Rechazado',  bg: 'bg-slate-50',   text: 'text-slate-400',   dot: 'bg-slate-300'   },
};

export const ALERT_LABEL: Record<string, string> = {
  no_match: 'Sin match',
  duplicate: 'Duplicado',
  policy_violation: 'Política',
  no_receipt: 'Sin recibo',
  rapid_repeat: 'Repetición',
  suspicious_pattern: 'Sospechoso',
  budget_warning: 'Presupuesto 80%',
  budget_exceeded: 'Presupuesto excedido',
};

export const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low:      { label: 'Baja',     bg: 'bg-slate-100',  text: 'text-slate-600'  },
  medium:   { label: 'Media',    bg: 'bg-amber-50',   text: 'text-amber-700'  },
  high:     { label: 'Alta',     bg: 'bg-orange-50',  text: 'text-orange-700' },
  critical: { label: 'Critica',  bg: 'bg-red-50',     text: 'text-red-700'    },
};

export const APPROVAL_LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  auto:     { label: 'Auto (<100€)',        bg: 'bg-emerald-50', text: 'text-emerald-700' },
  manager:  { label: 'Manager (100-500€)',  bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
  director: { label: 'Director (≥500€)',    bg: 'bg-amber-50',   text: 'text-amber-700'   },
  // Legacy pre-Sprint-1 rows
  admin:    { label: 'Admin (legacy)',      bg: 'bg-slate-100',  text: 'text-slate-600'   },
};

export const ROLE_LABELS: Record<string, string> = {
  employee: 'Empleado',
  admin: 'Administrador',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: 'Tarjeta',
  cash: 'Efectivo',
  transfer: 'Transferencia',
};

// ── Department Comparison ──────────────────────────────────────────

export interface DepartmentComparison {
  department: string;
  total_spending: number;
  budget_total: number;
  employee_count: number;
  receipt_count: number;
  utilization_pct: number;
  top_category: string | null;
}

// ── AI Forecast ────────────────────────────────────────────────────

export interface ForecastHistoryPoint {
  month: string;
  total: number;
  count: number;
}

export interface Forecast {
  employee_id: string;
  employee_name: string;
  current_month_spending: number;
  forecast_next_month: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: 'high' | 'medium' | 'low';
  insight: string;
  monthly_history: ForecastHistoryPoint[];
}

// ── Bank Import Types ──────────────────────────────────────────────

export interface ImportPreviewRow {
  date: string | null;
  merchant: string | null;
  amount: number | null;
  reference: string | null;
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[];
  total: number;
}

export interface ImportResult {
  total_rows: number;
  created: number;
  skipped: number;
  errors: string[];
}

// ── Spending by Project ────────────────────────────────────────────

export interface SpendingByProject {
  project_id: string;
  code: string;
  name: string;
  total_spending: number;
  receipt_count: number;
}

// ── Periods ────────────────────────────────────────────────────────

export interface Period {
  id: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
  closed_at: string | null;
}

export interface EmployeePeriodStatus {
  employee: Employee;
  receipt_count: number;
  has_submitted: boolean;
  review_status: 'pending' | 'approved' | 'flagged';
  review_note?: string | null;
}

export interface MyCurrentPeriodStatus {
  period_id: string;
  period_start: string;
  period_end: string;
  days_remaining: number;
  period_status: 'open' | 'closed';
  review_status: 'pending' | 'approved' | 'flagged';
  review_note: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  flagged_receipts_count: number;
}

export interface ReviewSummary {
  period_id: string;
  total: number;
  approved: number;
  flagged: number;
  pending: number;
  complete: boolean;
}
