-- ============================================================
--  STUDENT SPONSOR SYSTEM — DATABASE SCHEMA + SEED
-- ============================================================

DROP TABLE IF EXISTS sponsorships CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ── USERS ────────────────────────────────────────────────────
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
-- Stores refresh tokens so we can invalidate them on logout
-- One user can have multiple refresh tokens (multiple devices)
CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token       VARCHAR(512) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── PASSWORD RESETS ───────────────────────────────────────────
CREATE TABLE password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── SCHOOLS ──────────────────────────────────────────────────
CREATE TABLE schools (
  school_id      SERIAL PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  paybill_number VARCHAR(20)  NOT NULL,
  account_format VARCHAR(100),
  county         VARCHAR(100),
  admin_id       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── STUDENTS ─────────────────────────────────────────────────
CREATE TABLE students (
  student_id    SERIAL PRIMARY KEY,
  user_id       INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  school_id     INTEGER REFERENCES schools(school_id) ON DELETE SET NULL,
  admission_no  VARCHAR(50),
  course        VARCHAR(200),
  year_of_study INTEGER CHECK (year_of_study BETWEEN 1 AND 8),
  fee_balance   NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  story         TEXT,
  photo_url     VARCHAR(500),
  doc_url       VARCHAR(500),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_note    TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── SPONSORSHIPS ─────────────────────────────────────────────
CREATE TABLE sponsorships (
  sponsorship_id   SERIAL PRIMARY KEY,
  sponsor_id       INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  student_id       INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  school_id        INTEGER REFERENCES schools(school_id) ON DELETE SET NULL,
  amount           NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method   VARCHAR(20) NOT NULL DEFAULT 'mpesa'
                     CHECK (payment_method IN ('mpesa', 'direct')),
  mpesa_ref        VARCHAR(100),
  mpesa_receipt    VARCHAR(100),
  checkout_req_id  VARCHAR(200),
  status           VARCHAR(20) NOT NULL DEFAULT 'initiated'
                     CHECK (status IN ('initiated', 'paid', 'confirmed', 'cancelled')),
  admin_confirmed  BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT,
  initiated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at          TIMESTAMP,
  confirmed_at     TIMESTAMP
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_users_email            ON users(email);
CREATE INDEX idx_users_verify_token     ON users(email_verify_token);
CREATE INDEX idx_refresh_tokens_token   ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX idx_password_resets_token  ON password_resets(token);
CREATE INDEX idx_students_status        ON students(status);
CREATE INDEX idx_students_user_id       ON students(user_id);
CREATE INDEX idx_sponsorships_sponsor   ON sponsorships(sponsor_id);
CREATE INDEX idx_sponsorships_student   ON sponsorships(student_id);
CREATE INDEX idx_sponsorships_status    ON sponsorships(status);

-- ============================================================
--  SEED DATA — password for all accounts: Test1234!
-- ============================================================
INSERT INTO users (full_name, email, password, role, phone, is_email_verified) VALUES
  ('Admin User',    'admin@test.com',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',   '254700000001', true),
  ('James Sponsor', 'sponsor@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'sponsor', '254700000002', true),
  ('Mary Student',  'student@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '254711000003', true);

INSERT INTO schools (name, paybill_number, account_format, county, admin_id) VALUES
  ('Maseno University', '400200', 'MSN{admission_no}', 'Kisumu', 1);

INSERT INTO students (user_id, school_id, admission_no, course, year_of_study, fee_balance, story, status) VALUES
  (3, 1, 'MSN/001/2024', 'Bachelor of Science in Computer Science', 2, 45000.00,
   'Second year CS student at Maseno University. My mother is a small-scale farmer and cannot afford my fees.',
   'verified');

INSERT INTO sponsorships (sponsor_id, student_id, school_id, amount, payment_method, mpesa_ref, status, admin_confirmed, paid_at) VALUES
  (2, 1, 1, 5000.00, 'mpesa', 'QHX7Y3K9PL', 'confirmed', true, NOW());