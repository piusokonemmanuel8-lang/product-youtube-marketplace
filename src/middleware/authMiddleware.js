const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'No token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await pool.query(
      `SELECT id, uuid, full_name, username, email, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: 'User not found',
      });
    }

    if (users[0].status !== 'active') {
      return res.status(403).json({
        message: 'User account is not active',
      });
    }

    const [roleRows] = await pool.query(
      `SELECT r.id, r.name
       FROM user_roles ur
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [users[0].id]
    );

    req.user = {
      ...users[0],
      roles: roleRows.map((role) => role.name),
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Not authorized',
      error: error.message,
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Not authorized',
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
}

function adminOnly(req, res, next) {
  return authorizeRoles('admin')(req, res, next);
}

function creatorOnly(req, res, next) {
  return authorizeRoles('creator')(req, res, next);
}

function viewerOnly(req, res, next) {
  return authorizeRoles('viewer', 'customer')(req, res, next);
}

module.exports = {
  protect,
  authorizeRoles,
  adminOnly,
  creatorOnly,
  viewerOnly,
};