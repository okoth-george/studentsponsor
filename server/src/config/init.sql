-- ============================================================
--  EDUBRIDGE — DATABASE SCHEMA + SEED
--  MVP: Student · Sponsor · Admin
--  Flow: Register → Profile → Bursary → Apply → Review → Fund
-- ============================================================

DROP TABLE IF EXISTS payment_records   CASCADE;
DROP TABLE IF EXISTS applications      CASCADE;
DROP TABLE IF EXISTS bursaries         CASCADE;
DROP TABLE IF EXISTS refresh_tokens    CASCADE;
DROP TABLE IF EXISTS password_resets   CASCADE;
DROP TABLE IF EXISTS students          CASCADE;
DROP TABLE IF EXISTS sponsors          CASCADE;
DROP TABLE IF EXISTS schools           CASCADE;
DROP TABLE IF EXISTS users             CASCADE;

-- ── USERS ────────────────────────────────────────────────────
-- Central auth table. Every actor (student, sponsor, admin)
-- has a row here. Role-specific data lives in child tables.
CREATE TABLE users (
  user_id              SERIAL PRIMARY KEY,
  full_name            VARCHAR(100)        NOT NULL,
  email                VARCHAR(150) UNIQUE NOT NULL,
  password             VARCHAR(255)        NOT NULL,
  role                 VARCHAR(20)         NOT NULL DEFAULT 'student'
                         CHECK (role IN ('student', 'sponsor', 'admin')),
  phone                VARCHAR(20),
  is_active            BOOLEAN             NOT NULL DEFAULT true,

  -- Email verification
  is_email_verified    BOOLEAN             NOT NULL DEFAULT false,
  email_verify_token   VARCHAR(255),
  email_verify_expires TIMESTAMP,

  -- Account lockout
  login_attempts       INTEGER             NOT NULL DEFAULT 0,
  lock_until           TIMESTAMP,

  created_at           TIMESTAMP           NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP           NOT NULL DEFAULT NOW()
);

-- ── REFRESH TOKENS ───────────────────────────────────────────
-- One user can hold multiple refresh tokens (multiple devices).
-- Deleted on logout or expiry.
CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER   NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token       VARCHAR(512) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── PASSWORD RESETS ──────────────────────────────────────────
-- Tokens are single-use (used = true after consumption).
CREATE TABLE password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER   NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used        BOOLEAN   NOT NULL DEFAULT false,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── SCHOOLS ──────────────────────────────────────────────────
-- Reference list only in MVP. No school login.
-- Schools are created and managed by admin.
-- paybill_number is where sponsors send payments.
CREATE TABLE schools (
  school_id      SERIAL PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  paybill_number VARCHAR(20)  NOT NULL,
  account_format VARCHAR(100),          -- e.g. "ADM{admission_no}"
  county         VARCHAR(100),
  is_active      BOOLEAN      NOT NULL DEFAULT true,  -- soft delete
  admin_id       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── STUDENTS ─────────────────────────────────────────────────
-- One row per student user. Created immediately on registration.
-- status tracks admin verification of the student profile.
-- doc_url: single fee statement upload for MVP.
--   (Will be migrated to student_documents table in a later phase
--    when per-bursary document requirements are introduced.)
CREATE TABLE students (
  student_id    SERIAL PRIMARY KEY,
  user_id       INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  school_id     INTEGER        REFERENCES schools(school_id) ON DELETE SET NULL,
  admission_no  VARCHAR(50),
  course        VARCHAR(200),
  year_of_study INTEGER        CHECK (year_of_study BETWEEN 1 AND 8),
  fee_balance   NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  story         TEXT,                   -- student's personal statement
  photo_url     VARCHAR(500),
  doc_url       VARCHAR(500),           -- fee statement document
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_note    TEXT,                   -- admin feedback on verification
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── SPONSORS ─────────────────────────────────────────────────
-- One row per sponsor user. Created immediately on registration.
-- Two-gate approval:
--   Gate 1 — email verification (users.is_email_verified = true)
--   Gate 2 — admin approval    (sponsors.status = 'verified')
-- A sponsor must pass BOTH gates before creating bursaries.
-- This prevents fake organizations from posting fraudulent bursaries.
--
-- status lifecycle:
--   pending  → verified  (admin approves)
--   pending  → rejected  (admin rejects — reason in admin_note)
--   verified → rejected  (admin can revoke — e.g. fraud discovered)
CREATE TABLE sponsors (
  sponsor_id        SERIAL PRIMARY KEY,
  user_id           INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  organization_name VARCHAR(200)  NOT NULL,
  organization_type VARCHAR(30)   NOT NULL
                      CHECK (organization_type IN (
                        'ngo', 'company', 'individual',
                        'government', 'religious', 'alumni'
                      )),
  website           VARCHAR(500),
  description       TEXT,                  -- what the organization does
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_note        TEXT,                  -- reason for rejection or notes
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── BURSARIES ────────────────────────────────────────────────
-- Created by verified sponsors only (enforced in service layer).
-- eligibility_criteria: free text for MVP.
--   (Will become structured JSON in a later phase for auto-matching.)
-- is_active: sponsor can close a bursary early.
-- slots: NULL means unlimited applicants.
-- sponsor_id references sponsors.sponsor_id (not users.user_id)
-- so the FK is to the sponsor profile, not just the user.
CREATE TABLE bursaries (
  bursary_id            SERIAL PRIMARY KEY,
  sponsor_id            INTEGER        NOT NULL REFERENCES sponsors(sponsor_id) ON DELETE CASCADE,
  title                 VARCHAR(200)   NOT NULL,
  description           TEXT,
  eligibility_criteria  TEXT,
  amount                NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  slots                 INTEGER        CHECK (slots > 0),  -- NULL = unlimited
  deadline              DATE           NOT NULL,
  is_active             BOOLEAN        NOT NULL DEFAULT true,
  created_at            TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- ── APPLICATIONS ─────────────────────────────────────────────
-- One row per student-bursary application.
-- A student may not apply to the same bursary twice (unique constraint).
-- status lifecycle:
--   pending → under_review → approved → funded
--   pending → rejected
-- rejection_reason is mandatory when status = 'rejected'
--   (enforced at application layer, not DB level for MVP).
-- reviewed_by: admin user_id who last changed the status.
CREATE TABLE applications (
  application_id    SERIAL PRIMARY KEY,
  student_id        INTEGER      NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  bursary_id        INTEGER      NOT NULL REFERENCES bursaries(bursary_id) ON DELETE CASCADE,
  motivation_letter TEXT,
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'funded')),
  rejection_reason  TEXT,
  reviewed_by       INTEGER      REFERENCES users(user_id) ON DELETE SET NULL,
  submitted_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),

  -- A student cannot apply to the same bursary more than once
  UNIQUE (student_id, bursary_id)
);

-- ── PAYMENT RECORDS ──────────────────────────────────────────
-- Created when a sponsor logs a payment for an approved application.
-- EduBridge does NOT hold funds. Sponsor pays to school paybill directly.
-- This table is the transparency and audit layer.
-- school_confirmed: set to true when admin acknowledges receipt.
-- application status moves to 'funded' after school_confirmed = true.
CREATE TABLE payment_records (
  payment_id        SERIAL PRIMARY KEY,
  application_id    INTEGER        NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  sponsor_id        INTEGER        NOT NULL REFERENCES sponsors(sponsor_id) ON DELETE CASCADE,
  student_id        INTEGER        NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  school_id         INTEGER        REFERENCES schools(school_id) ON DELETE SET NULL,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paybill_number    VARCHAR(20)    NOT NULL,   -- school paybill at time of payment
  payment_reference VARCHAR(100),              -- sponsor-provided M-Pesa ref or bank ref
  payment_date      DATE           NOT NULL,
  school_confirmed  BOOLEAN        NOT NULL DEFAULT false,
  confirmed_by      INTEGER        REFERENCES users(user_id) ON DELETE SET NULL,
  confirmed_at      TIMESTAMP,
  notes             TEXT,
  created_at        TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_users_email              ON users(email);
CREATE INDEX idx_users_verify_token       ON users(email_verify_token);
CREATE INDEX idx_refresh_tokens_token     ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user      ON refresh_tokens(user_id);
CREATE INDEX idx_password_resets_token    ON password_resets(token);
CREATE INDEX idx_students_status          ON students(status);
CREATE INDEX idx_students_user_id         ON students(user_id);
CREATE INDEX idx_students_school_id       ON students(school_id);
CREATE INDEX idx_sponsors_user_id         ON sponsors(user_id);
CREATE INDEX idx_sponsors_status          ON sponsors(status);
CREATE INDEX idx_bursaries_sponsor_id     ON bursaries(sponsor_id);
CREATE INDEX idx_bursaries_deadline       ON bursaries(deadline);
CREATE INDEX idx_bursaries_is_active      ON bursaries(is_active);
CREATE INDEX idx_applications_student_id  ON applications(student_id);
CREATE INDEX idx_applications_bursary_id  ON applications(bursary_id);
CREATE INDEX idx_applications_status      ON applications(status);
CREATE INDEX idx_payment_records_app_id   ON payment_records(application_id);
CREATE INDEX idx_payment_records_sponsor  ON payment_records(sponsor_id);
CREATE INDEX idx_payment_records_student  ON payment_records(student_id);

-- ============================================================
--  SEED DATA
--  Password for all accounts: Test1234!
--  Hash: bcrypt, cost 10
-- ============================================================

-- Admin is the only seeded user.
-- Sponsors and students are created through registration.
INSERT INTO users (full_name, email, password, role, phone, is_email_verified) VALUES
  ('Admin User', 'admin@edubridge.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '254700000001', true);

-- Schools are managed by admin only.
-- Students select from this list when completing their profile.
INSERT INTO schools (name, paybill_number, account_format, county, admin_id) VALUES
  ('Maseno University',     '400200', 'MSN{admission_no}', 'Kisumu',       1),
  ('University of Nairobi', '522500', 'UON{admission_no}', 'Nairobi',      1),
  ('Kenyatta University',   '200999', 'KU{admission_no}',  'Nairobi',      1),
  ('Moi University',        '303030', 'MU{admission_no}',  'Uasin Gishu',  1),
  ('Strathmore University', '606060', 'STR{admission_no}', 'Nairobi',      1);