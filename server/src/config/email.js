const nodemailer = require('nodemailer');
require('dotenv').config();

/*
  WHY NODEMAILER?
  ───────────────
  Nodemailer is the standard Node.js library for sending emails.
  It works with any SMTP provider:
  - Mailtrap  (development — fake inbox, nothing actually sent)
  - SendGrid  (production — reliable, free tier available)
  - Gmail     (quick setup — needs App Password, not your real password)

  For development, use Mailtrap:
  1. Sign up at https://mailtrap.io (free)
  2. Go to Email Testing → Inboxes → SMTP Settings
  3. Copy the credentials into your .env
  All emails land in the Mailtrap inbox — nothing reaches real addresses.
*/

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── sendVerificationEmail ─────────────────────────────────────
const sendVerificationEmail = async (email, fullName, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"Student Sponsor Platform" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Student Sponsor, ${fullName}!</h2>
        <p>Thank you for registering. Please verify your email address to activate your account.</p>
        <a href="${verifyUrl}"
           style="display:inline-block; padding:12px 24px; background:#2563eb;
                  color:white; text-decoration:none; border-radius:6px; margin:16px 0;">
          Verify Email Address
        </a>
        <p style="color:#666; font-size:14px;">
          This link expires in 24 hours.<br>
          If you didn't create an account, you can safely ignore this email.
        </p>
        <p style="color:#999; font-size:12px;">
          Or copy this link: ${verifyUrl}
        </p>
      </div>
    `,
  });
};

// ── sendPasswordResetEmail ────────────────────────────────────
const sendPasswordResetEmail = async (email, fullName, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"Student Sponsor Platform" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hi ${fullName}, we received a request to reset your password.</p>
        <a href="${resetUrl}"
           style="display:inline-block; padding:12px 24px; background:#dc2626;
                  color:white; text-decoration:none; border-radius:6px; margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#666; font-size:14px;">
          This link expires in 1 hour.<br>
          If you did not request a password reset, please ignore this email.
          Your password will not change.
        </p>
        <p style="color:#999; font-size:12px;">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };