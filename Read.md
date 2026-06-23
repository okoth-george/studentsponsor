# EduBridge Backend API

EduBridge is a backend platform built to connect students who are struggling with school fees to bursary providers, sponsors, NGOs, and government funding programs.

The main idea behind this project is to make bursary allocation more transparent and easier to access. Instead of students struggling to find funding opportunities manually, EduBridge acts as the bridge between students and organizations willing to help.

At the moment, the project is still in its MVP stage and currently focuses on the student side of the system.

---

## Current Progress

This version is built with:

* Node.js
* Express.js
* PostgreSQL
* JWT Authentication

So far, the backend supports:

* User registration with email verification
* Secure login with JWT access and refresh tokens
* Refresh token rotation for better security
* Account lockout after multiple failed login attempts
* Password reset using email tokens
* Student profile creation and updates
* Uploading fee statement documents
* Admin verification of student accounts
* Role-based access control (student, sponsor, admin)

The core authentication and student onboarding flow is fully working.

---

## Project Structure

The project follows a clean layered architecture to keep the code maintainable.

src/
├── config/
├── controllers/
├── middleware/
├── repositories/
├── routes/
├── services/
└── utils/

Uploads are stored locally for now under:

uploads/documents/

The database schema and seed data are inside:

init.sql

---

## How the Architecture Works

Every request follows this flow:

Route → Middleware → Controller → Service → Repository → Database

Here’s how each layer works:

* **Routes** handle endpoints and connect middleware.
* **Middleware** handles authentication, authorization, and validation.
* **Controllers** receive requests and send responses.
* **Services** contain the business logic.
* **Repositories** contain all raw SQL queries.

I separated responsibilities this way to keep the system scalable and easy to debug.

---

## Database Design

The database currently has these main tables:

* **users** → stores authentication data for all roles
* **students** → stores student-specific information
* **schools** → stores institution reference data
* **bursaries** → funding opportunities created by sponsors
* **applications** → student applications to bursaries
* **payment_records** → sponsor payment tracking
* **refresh_tokens** → active login sessions
* **password_resets** → temporary password reset tokens

### Student Verification Status

A student profile can be:

* **pending** → waiting for admin review
* **verified** → approved by admin
* **rejected** → declined with an admin note

### Application Status Flow

pending → under_review → approved → funded
pending → under_review → rejected

---

## Payment Model

EduBridge does not handle money directly.

When a bursary is approved, sponsors pay directly to the school’s M-Pesa paybill. The platform only records the payment and tracks confirmation from the school.

This reduces financial risk and keeps the platform transparent.

---

## Environment Setup

Create a `.env` file in the root directory and add:

* Database connection URL
* JWT secrets
* Email credentials
* Lockout configurations

This keeps sensitive configuration outside the codebase.

---

## Running the Project

Clone the project:

```bash
git clone <repo-url>
cd edubridge-backend
npm install
```

Create your environment variables:

```bash
cp .env.example .env
```

Create the database and load schema:

```bash
psql -U postgres -c "CREATE DATABASE edubridge;"
psql -U postgres -d edubridge -f init.sql
```

Create upload directory:

```bash
mkdir -p uploads/documents
```

Start the development server:

```bash
npm run dev
```

---

## Main API Routes

### Authentication Routes

These handle:

* Registration
* Email verification
* Login
* Logout
* Password reset
* Profile retrieval
* Password change

Base route:

/api/auth

---

### Student Routes

These handle:

* Getting student profile
* Updating profile
* Uploading fee statements
* Admin verification
* Listing students

Base route:

/api/students

---

## Authentication Flow

Protected routes require:

Authorization: Bearer <access_token>

Access tokens expire after 15 minutes.

Refresh tokens are stored in httpOnly cookies and used to generate new access tokens securely.

This makes the authentication flow more secure while supporting long sessions.

---

## Rate Limiting

To reduce abuse:

* Login → 10 requests per 15 minutes
* Register → 5 requests per hour
* Forgot password → 3 requests per hour
* Resend verification → 3 requests per hour

---

## Seed Accounts

For testing:

Admin:
[admin@test.com](mailto:admin@test.com)

Sponsor:
[sponsor@test.com](mailto:sponsor@test.com)

Student:
[student@test.com](mailto:student@test.com)

Password for all:

Test1234!

---

## Testing

The API can be tested easily using Postman.

Recommended test flow:

1. Register a new user
2. Verify email
3. Login
4. Create student profile
5. Upload fee statement
6. Verify student as admin

This covers the complete MVP student flow.

---

## What’s Coming Next

Still in progress:

* Sponsor dashboard and bursary creation
* Student bursary applications
* Application review by admins
* Email notifications
* School verification workflow
* Scheduled cleanup jobs
* Cloud file storage (S3/Cloudinary)
* Analytics dashboard

---

## Technical Debt / Known Limitations

There are a few things I still need to improve:

* Unverified users can leave unused rows in the database
* File uploads are still stored locally
* Student documents are stored in a single field instead of a dedicated table
* Bursary eligibility is currently plain text and will later be structured for smarter matching

These are planned improvements as the project grows.

---

## Why I Built This

Many students miss opportunities because bursary systems are often disorganized, slow, or not transparent enough.

I built EduBridge to solve that problem by creating a centralized platform where students can discover funding opportunities and sponsors can support verified cases more efficiently.

The long-term goal is to reduce school dropouts caused by financial challenges.
