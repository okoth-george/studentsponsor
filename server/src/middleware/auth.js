const jwt = require('jsonwebtoken');
require('dotenv').config();

/*
  TWO TOKENS EXPLAINED:
  ─────────────────────
  ACCESS TOKEN  — short-lived (15 min). Sent with every API request.
                  If stolen, expires quickly. Stored in memory on frontend.

  REFRESH TOKEN — long-lived (7 days). Only used to get a new access token.
                  Stored in an httpOnly cookie (JS can't read it — XSS safe).
                  Stored in DB so we can invalidate it on logout.

  Flow:
  1. Login  → get access token (15min) + refresh token (7d) in cookie
  2. Request → send access token in Authorization header
  3. Access token expires → call /api/auth/refresh → get new access token
  4. Logout → delete refresh token from DB + clear cookie
*/

// ── authenticate ─────────────────────────────────────────────
// Verifies the access token on every protected request
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired. Please refresh.',
        code: 'TOKEN_EXPIRED',  // frontend uses this code to trigger refresh
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

// ── authorize ────────────────────────────────────────────────
// Role-based access control
// Usage: router.get('/admin/users', authenticate, authorize('admin'), handler)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
};

// ── optionalAuth ─────────────────────────────────────────────
// For routes that work for both guests and logged-in users
// e.g. GET /students — guests see limited info, logged-in users see more
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };