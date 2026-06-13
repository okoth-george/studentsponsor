# EduBridge — Backend API

A platform that connects financially needy students with bursary providers, sponsors, donors, NGOs, and government funding opportunities. EduBridge acts as the transparency and matching layer between students who need financial assistance and organizations willing to provide it.

---

## Current Build Status

**Phase:** MVP — Student Role (Backend)
**Stack:** Node.js · Express.js · PostgreSQL · JWT

What is built and working:

- User registration with email verification
- JWT authentication (access token + refresh token rotation)
- Account lockout after failed login attempts
- Password reset via email token
- Student profile creation and update
- Fee statement document upload
- Admin student verification workflow
- Role-based access control (student · sponsor · admin)

---

## Project Structure

```
src/
├── config/
│   ├── db.js                  # PostgreSQL pool connection
│   └── email.js               # Nodemailer transporter
│
├── controllers/
│   ├── authController.js      # Register, login, logout, password, profile
│   └── studentController.js   # Student profile CRUD + admin status update
│
├── middleware/
│   ├── auth.js                # authenticate · authorize · optionalAuth
│   └── validators.js          # express-validator rules for all routes
│
├── repositories/
│   ├── userRepository.js      # All raw SQL for users table
│   └── studentRepository.js   # All raw SQL for students table
│
├── routes/
│   ├── authRoutes.js          # /api/auth/*
│   └── studentRoutes.js       # /api/students/*
│
├── services/
│   ├── authService.js         # Login · refresh · logout
│   ├── verificationService.js # Register · verify email · resend
│   ├── passwordService.js     # Forgot password · reset · change
│   ├── userService.js         # getProfile (shared across roles)
│   ├── studentService.js      # Student business logic
│   └── utils/
│       └── authUtils.js       # Token generation · sanitizeUser · fail()
│
uploads/
└── documents/                 # Fee statement uploads (local, MVP only)

init.sql                       # Full database schema + seed data
```

---

## Architecture Pattern

Every request follows this strict chain:

```
Route → Middleware → Controller → Service → Repository → Database
```

- **Routes** — define endpoints, attach middleware and rate limiters
- **Middleware** — authentication, authorization, input validation
- **Controllers** — read req, call service, send response. No logic.
- **Services** — all business rules live here. No DB calls.
- **Repositories** — all raw SQL lives here. No business logic.

---

## Database Schema

### Tables

| Table | Purpose |
|---|---|
| `users` | Core auth record for every actor |
| `students` | Student profile linked to a user |
| `schools` | Reference list of institutions (admin-managed) |
| `bursaries` | Funding programs created by sponsors |
| `applications` | Student applications to bursaries |
| `payment_records` | Audit log of sponsor payments to school paybills |
| `refresh_tokens` | Active refresh tokens (supports multiple devices) |
| `password_resets` | Single-use password reset tokens |

### Student Verification Status

| Status | Meaning |
|---|---|
| `pending` | Profile submitted, awaiting admin review |
| `verified` | Admin has confirmed enrollment and documents |
| `rejected` | Admin rejected — reason stored in `admin_note` |

### Application Lifecycle

```
pending → under_review → approved → funded
                       → rejected
```

### Payment Flow

EduBridge does **not** hold funds. Sponsors pay directly to the school's M-Pesa paybill. EduBridge records the transaction and the school confirms receipt. Application moves to `funded` after confirmation.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/edubridge

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_secret_here
REFRESH_TOKEN_EXPIRES_IN=7d

# Account Lockout
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME_MINUTES=15

# Email (Nodemailer)
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USER=your@email.com
MAIL_PASS=your_email_password
MAIL_FROM=EduBridge <no-reply@edubridge.com>
```

---

## Setup

```bash
# 1. Clone and install
git clone https://github.com/your-repo/edubridge-backend.git
cd edubridge-backend
npm install

# 2. Create environment file
cp .env.example .env
# Fill in your values

# 3. Set up database
psql -U postgres -c "CREATE DATABASE edubridge;"
psql -U postgres -d edubridge -f init.sql

# 4. Create upload directory
mkdir -p uploads/documents

# 5. Start server
npm run dev
```

---

## API Reference

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new student or sponsor |
| GET | `/verify-email?token=` | Public | Verify email address |
| POST | `/resend-verification` | Public | Resend verification email |
| POST | `/login` | Public | Login and receive tokens |
| POST | `/refresh` | Public | Get new access token via cookie |
| POST | `/logout` | Required | Invalidate refresh token |
| POST | `/forgot-password` | Public | Send password reset email |
| POST | `/reset-password` | Public | Reset password with token |
| GET | `/profile` | Required | Get own user profile |
| PATCH | `/change-password` | Required | Change password while logged in |

### Student Routes — `/api/students`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/profile` | Required | student | Get own full profile |
| PATCH | `/profile` | Required | student | Update own profile |
| POST | `/document` | Required | student | Upload fee statement |
| GET | `/` | Required | admin | List all students (optional `?status=`) |
| GET | `/:student_id` | Required | admin | Get one student by ID |
| PATCH | `/:student_id/status` | Required | admin | Verify or reject a student |

---

## Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Access tokens expire in **15 minutes**. Use `POST /api/auth/refresh` to get a new one. The refresh token is stored in an `httpOnly` cookie automatically.

---

## Rate Limiting

| Endpoint | Limit |
|---|---|
| `/login` | 10 requests per 15 minutes per IP |
| `/register` | 5 requests per hour per IP |
| `/forgot-password` | 3 requests per hour per IP |
| `/resend-verification` | 3 requests per hour per IP |

---

## Seed Accounts

All seed accounts use the password: `Test1234!`

| Email | Role | Notes |
|---|---|---|
| `admin@test.com` | admin | Full platform access |
| `sponsor@test.com` | sponsor | Can create bursaries |
| `student@test.com` | student | Verified, has a profile |

---

## Testing with Postman

### Full Student Flow

**1. Register**
```
POST /api/auth/register
{
  "full_name": "John Kamau",
  "email": "john.kamau@test.com",
  "password": "Test1234!",
  "role": "student",
  "phone": "254712345678"
}
```

**2. Get verification token** (development only)
```sql
SELECT email_verify_token FROM users WHERE email = 'john.kamau@test.com';
```

**3. Verify email**
```
GET /api/auth/verify-email?token=<token>
```

**4. Login**
```
POST /api/auth/login
{
  "email": "john.kamau@test.com",
  "password": "Test1234!"
}
```
Copy the `accessToken` from the response.

**5. Update profile**
```
PATCH /api/students/profile
Authorization: Bearer <accessToken>
{
  "school_id": 1,
  "admission_no": "MSN/002/2024",
  "course": "Bachelor of Commerce",
  "year_of_study": 2,
  "fee_balance": 38000,
  "story": "Second year student. Father lost his job last year."
}
```

**6. Admin verifies student**
```
PATCH /api/students/1/status
Authorization: Bearer <adminToken>
{
  "status": "verified",
  "admin_note": "Documents confirmed."
}
```

---

## What Is Not Built Yet

The following are designed and documented but not yet implemented:

- Sponsor role (register, create bursaries, log payments)
- Bursary browsing and student application flow
- Admin application review (approve / reject)
- Email notifications on application status changes
- School verification flow and timeout policy
- Scheduled cleanup of unverified ghost accounts
- Production file storage (S3 or Cloudinary — currently local disk)
- Analytics and reporting module

---

## Technical Debt Logged

- Unverified accounts older than 7 days accumulate as ghost rows in the `students` table. A scheduled cleanup job is needed.
- `doc_url` is a single field. Will be migrated to a `student_documents` table when per-bursary document requirements are introduced.
- File uploads are stored on local disk. Must be replaced with cloud storage before any production deployment.
- `eligibility_criteria` on bursaries is free text. Will become structured JSON for auto-matching in a later phase.