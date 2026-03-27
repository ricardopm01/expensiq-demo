// ExpensIQ TypeScript types — mirrors backend Pydantic schemas

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: string;
  monthly_budget: number | null;
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
}

export interface ApprovalSummary {
  pending_auto: number;
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
}

export interface Alert {
  id: string;
  employee_id: string | null;
  receipt_id: string | null;
  alert_type: string;
  description: string;
  severity: string;
  is_read: boolean;
  resolved: boolean;
  created_at: string | null;
  resolved_at: string | null;
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
};

export const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low:      { label: 'Baja',     bg: 'bg-slate-100',  text: 'text-slate-600'  },
  medium:   { label: 'Media',    bg: 'bg-amber-50',   text: 'text-amber-700'  },
  high:     { label: 'Alta',     bg: 'bg-orange-50',  text: 'text-orange-700' },
  critical: { label: 'Critica',  bg: 'bg-red-50',     text: 'text-red-700'    },
};

export const APPROVAL_LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  auto:  { label: 'Auto (<100€)',   bg: 'bg-emerald-50', text: 'text-emerald-700' },
  admin: { label: 'Admin (≥100€)',  bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
  // Legacy compat for existing DB rows
  manager:  { label: 'Admin (≥100€)', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  director: { label: 'Admin (≥100€)', bg: 'bg-indigo-50', text: 'text-indigo-700' },
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
