
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ;
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME     ;
const ADMIN_PHONE    = process.env.SEED_ADMIN_PHONE    ;

const seedAdmin = async () => {
  try {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const existing = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existing.rows.length > 0) {
      // Admin already exists — update password instead of duplicating
      await pool.query(
        `UPDATE users SET
           password = $1,
           updated_at = NOW()
         WHERE email = $2`,
        [hashedPassword, ADMIN_EMAIL]
      );
      console.log(`✔ Admin password updated for ${ADMIN_EMAIL}`);
    } else {
      // Create fresh admin account
      await pool.query(
        `INSERT INTO users
           (full_name, email, password, role, phone, is_email_verified)
         VALUES ($1, $2, $3, 'admin', $4, true)`,
        [ADMIN_NAME, ADMIN_EMAIL, hashedPassword, ADMIN_PHONE]
      );
      console.log(`✔ Admin account created: ${ADMIN_EMAIL}`);
    }

    console.log(`  Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } catch (err) {
    console.error('✘ Seeding admin failed:', err.message);
  } finally {
    await pool.end();
  }
};

seedAdmin();