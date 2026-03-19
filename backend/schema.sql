-- ExpensIQ — Database Schema
-- Executed on first PostgreSQL startup via docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────────────
CREATE TYPE receipt_status AS ENUM (
    'pending', 'processing', 'matched', 'review', 'flagged', 'rejected'
);

CREATE TYPE expense_category AS ENUM (
    'transport', 'meals', 'lodging', 'supplies',
    'entertainment', 'utilities', 'other'
);

CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');

-- ── Employees ────────────────────────────────────────────────────────
CREATE TABLE employees (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(255) NOT NULL,
    email          VARCHAR(255) UNIQUE NOT NULL,
    department     VARCHAR(100),
    role           user_role NOT NULL DEFAULT 'employee',
    monthly_budget NUMERIC(10,2),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Receipts ─────────────────────────────────────────────────────────
CREATE TABLE receipts (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    upload_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    image_url        TEXT,
    merchant         VARCHAR(255),
    date             DATE,
    amount           NUMERIC(10,2),
    currency         VARCHAR(3) DEFAULT 'EUR',
    tax              NUMERIC(10,2),
    category         expense_category DEFAULT 'other',
    status           receipt_status NOT NULL DEFAULT 'pending',
    ocr_confidence   NUMERIC(4,3),
    ocr_raw_text     TEXT,
    ocr_provider     VARCHAR(50),
    ocr_processed_at TIMESTAMPTZ,
    notes            TEXT
);

CREATE INDEX idx_receipts_employee ON receipts(employee_id);
CREATE INDEX idx_receipts_status   ON receipts(status);
CREATE INDEX idx_receipts_date     ON receipts(date);

-- ── Bank Transactions ────────────────────────────────────────────────
CREATE TABLE bank_transactions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    external_id VARCHAR(255) UNIQUE,
    date        DATE NOT NULL,
    merchant    VARCHAR(255),
    amount      NUMERIC(10,2) NOT NULL,
    currency    VARCHAR(3) DEFAULT 'EUR',
    account_id  VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_txn_date     ON bank_transactions(date);
CREATE INDEX idx_txn_employee ON bank_transactions(employee_id);

-- ── Matches ──────────────────────────────────────────────────────────
CREATE TABLE matches (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id     UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
    confidence     NUMERIC(4,3),
    match_method   VARCHAR(50),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(receipt_id, transaction_id)
);

-- ── Alerts ───────────────────────────────────────────────────────────
CREATE TABLE alerts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    receipt_id  UUID REFERENCES receipts(id) ON DELETE SET NULL,
    alert_type  VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    resolved    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_employee ON alerts(employee_id);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);
