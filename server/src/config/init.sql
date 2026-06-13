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
  admin_id       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── STUDENTS ─────────────────────────────────────────────────
-- One row per student user. Created after user registers
-- and completes their profile.
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

-- ── BURSARIES ────────────────────────────────────────────────
-- Created by sponsors. Students apply to these.
-- eligibility_criteria: free text for MVP.
--   (Will become structured JSON in a later phase for auto-matching.)
-- is_active: sponsor can close a bursary early.
-- slots: NULL means unlimited applicants.
CREATE TABLE bursaries (
  bursary_id            SERIAL PRIMARY KEY,
  sponsor_id            INTEGER        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
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
-- school_confirmed: set to true when admin or school acknowledges receipt.
-- application status moves to 'funded' after school_confirmed = true.
CREATE TABLE payment_records (
  payment_id        SERIAL PRIMARY KEY,
  application_id    INTEGER        NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  sponsor_id        INTEGER        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
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

INSERT INTO users (full_name, email, password, role, phone, is_email_verified) VALUES
  ('Admin User',      'admin@test.com',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',   '254700000001', true),
  ('James Sponsor',   'sponsor@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'sponsor', '254700000002', true),
  ('Mary Student',    'student@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '254711000003', true);

INSERT INTO schools (name, paybill_number, account_format, county, admin_id) VALUES
  ('Maseno University', '400200', 'MSN{admission_no}', 'Kisumu', 1);

INSERT INTO students (user_id, school_id, admission_no, course, year_of_study, fee_balance, story, status) VALUES
  (3, 1, 'MSN/001/2024', 'Bachelor of Science in Computer Science', 2, 45000.00,
   'Second year CS student at Maseno University. My mother is a small-scale farmer and cannot afford my fees.',
   'verified');

INSERT INTO bursaries (sponsor_id, title, description, eligibility_criteria, amount, slots, deadline, is_active) VALUES
  (2,
   'James Sponsor STEM Bursary 2024',
   'Supporting STEM students in public universities who demonstrate financial need.',
   'Must be enrolled in a STEM course. Minimum year 2. Fee balance above KES 20,000.',
   15000.00,
   10,
   '2024-12-31',
   true);

INSERT INTO applications (student_id, bursary_id, motivation_letter, status) VALUES
  (1, 1,
   'I am a second year Computer Science student struggling to clear my fee balance. This bursary would allow me to sit my exams and continue my studies.',
   'approved');

INSERT INTO payment_records (application_id, sponsor_id, student_id, school_id, amount, paybill_number, payment_reference, payment_date, school_confirmed, confirmed_by, confirmed_at) VALUES
  (1, 2, 1, 1, 15000.00, '400200', 'QHX7Y3K9PL', CURRENT_DATE, true, 1, NOW());