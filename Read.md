# EduBridge – School Fee Debt Tracker & Bursary Matching Platform

## Project Overview

EduBridge is a web-based platform designed to help students stay in school by connecting financially needy students with bursary providers, sponsors, donors, NGOs, foundations, and government funding opportunities.

Many students miss classes, defer studies, or drop out because of unpaid school fees. At the same time, bursaries and sponsorship opportunities often exist but are difficult to discover, apply for, verify, and distribute transparently.

EduBridge acts as the bridge between students who need financial assistance and organizations or individuals willing to provide educational support.

---

# Core Problem

Educational institutions frequently struggle with:

* Students accumulating fee balances
* Lack of visibility into students' financial needs
* Inefficient bursary application processes
* Fraudulent applications
* Sponsors lacking transparency on how funds are used
* Difficulty matching students with relevant funding opportunities

Students often:

* Don't know available bursaries
* Miss application deadlines
* Submit applications manually
* Have no centralized platform to track applications

Sponsors often:

* Cannot easily identify deserving students
* Lack tools to verify student information
* Have no visibility into impact after funding

---

# Solution

EduBridge provides a centralized digital ecosystem where:

1. Students register and create profiles.
2. Schools verify student information.
3. Sponsors create funding opportunities.
4. Students apply for bursaries.
5. Administrators review and validate applications.
6. Sponsors approve funding.
7. Funds are tracked transparently.
8. Students and sponsors monitor application progress in real time.

---

# Main User Roles

## Student

Students can:

* Register and verify email
* Complete profile information
* View fee balances
* Upload supporting documents
* Search available bursaries
* Apply for bursaries
* Track application status
* Receive notifications
* View funding history

---

## Sponsor

Sponsors can:

* Register and verify accounts
* Create bursary programs
* Define eligibility criteria
* Review student applications
* Approve or reject applications
* Monitor impact metrics
* View funded students

Examples:

* NGOs
* Alumni groups
* Companies
* Government agencies
* Individual donors
* Religious organizations

---

## School

Schools can:

* Register institutions
* Verify student enrollment
* Update fee balances
* Confirm academic records
* Validate student information
* Monitor sponsored students

---

## Administrator

Administrators manage:

* Users
* Schools
* Sponsors
* Applications
* System settings
* Reports
* Fraud prevention
* Platform moderation

---

# System Modules

## Authentication Module

Handles:

* Registration
* Login
* Logout
* JWT Authentication
* Refresh Tokens
* Password Reset
* Email Verification
* Account Locking
* Role-Based Access Control

Roles:

* Student
* Sponsor
* School
* Admin

---

## Student Management Module

Stores:

* Personal information
* Admission details
* Academic level
* School information
* Fee balance
* Application history
* Verification status

---

## School Management Module

Stores:

* School information
* Paybill number
* Contact details
* Verification status
* Student records

---

## Sponsor Management Module

Stores:

* Sponsor profile
* Organization details
* Funding programs
* Funding history
* Impact analytics

---

## Bursary Management Module

Sponsors can create:

* Bursary title
* Description
* Eligibility criteria
* Funding amount
* Application deadline

Students can:

* Browse bursaries
* Apply
* Upload required documents

---

## Application Management Module

Application lifecycle:

Pending
→ Under Review
→ Approved
→ Funded

or

Pending
→ Rejected

Every application maintains a full audit trail.

---

## Fee Debt Tracking Module

Tracks:

* Total fee balance
* Amount funded
* Remaining balance
* Payment history

This helps sponsors understand the exact financial needs of each student.

---

## Notification Module

Notifications via:

* Email
* In-app alerts

Events:

* Registration
* Verification
* Application submission
* Approval
* Rejection
* Funding completion

---

## Reporting & Analytics Module

Provides:

### For Admins

* Total students
* Total sponsors
* Total schools
* Total applications
* Total funds distributed

### For Sponsors

* Students funded
* Money distributed
* Success stories
* Funding impact

### For Schools

* Students assisted
* Outstanding fee balances
* Funding received

---

# Suggested Technology Stack

## Backend

* Node.js
* Express.js
* PostgreSQL
* JWT Authentication
* bcrypt
* Nodemailer

Architecture:

Controller
→ Service
→ Repository
→ Database

---

## Frontend

* React
* Vite
* React Router
* Axios
* Context API

---

## Database

PostgreSQL

Main tables:

* users
* students
* sponsors
* schools
* bursaries
* applications
* refresh_tokens
* password_resets
* notifications

---

# Security Features

* Password hashing with bcrypt
* JWT access tokens
* Refresh token rotation
* Email verification
* Password reset tokens
* Account lockout after failed login attempts
* Role-based authorization
* Secure API endpoints
* Input validation

---

# Long-Term Vision

EduBridge aims to become a trusted educational funding platform that reduces student dropouts by making financial assistance more accessible, transparent, and accountable.

The goal is to ensure that no student misses educational opportunities because they could not find or access available financial support.

EduBridge is not simply a bursary application system—it is a complete educational funding ecosystem connecting students, schools, sponsors, and administrators through one transparent platform.
