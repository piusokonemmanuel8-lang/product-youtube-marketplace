const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function resolveUserRoles(userId) {
  const [roleRows] = await pool.query(
    `SELECT r.name
     FROM user_roles ur
     INNER JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = ?`,
    [userId]
  );

  const roles = [...new Set(roleRows.map((row) => row.name))];

  const [creatorProfiles] = await pool.query(
    `SELECT id
     FROM creator_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  const [channelsByUserId] = await pool.query(
    `SELECT ch.id
     FROM channels ch
     LEFT JOIN creator_profiles cp ON ch.creator_id = cp.id
     WHERE cp.user_id = ?
     LIMIT 1`,
    [userId]
  );

  const shouldBeCreator = creatorProfiles.length > 0 || channelsByUserId.length > 0;

  if (shouldBeCreator && !roles.includes('creator')) {
    const [creatorRoleRows] = await pool.query(
      `SELECT id
       FROM roles
       WHERE name = 'creator'
       LIMIT 1`
    );

    if (creatorRoleRows.length) {
      const creatorRoleId = creatorRoleRows[0].id;

      await pool.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT ?, ?
         WHERE NOT EXISTS (
           SELECT 1
           FROM user_roles
           WHERE user_id = ?
             AND role_id = ?
         )`,
        [userId, creatorRoleId, userId, creatorRoleId]
      );

      roles.push('creator');
    }
  }

  return [...new Set(roles)];
}

async function register(req, res) {
  const connection = await pool.getConnection();

  try {
    const {
      full_name,
      username,
      email,
      phone,
      password,
      role = 'viewer',
    } = req.body;

    if (!full_name || !username || !email || !password) {
      return res.status(400).json({
        message: 'Full name, username, email and password are required',
      });
    }

    const [existingUsers] = await connection.query(
      `SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1`,
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: 'Email or username already exists',
      });
    }

    const [roles] = await connection.query(
      `SELECT id, name FROM roles WHERE name = ? LIMIT 1`,
      [role]
    );

    if (roles.length === 0) {
      return res.status(400).json({
        message: 'Invalid role selected',
      });
    }

    const roleRow = roles[0];
    const password_hash = await bcrypt.hash(password, 10);
    const uuid = crypto.randomUUID();

    await connection.beginTransaction();

    const [userResult] = await connection.query(
      `INSERT INTO users (uuid, full_name, username, email, phone, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, full_name, username, email, phone || null, password_hash]
    );

    const userId = userResult.insertId;

    await connection.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
      [userId, roleRow.id]
    );

    await connection.query(
      `INSERT INTO viewer_profiles (user_id, display_name) VALUES (?, ?)`,
      [userId, full_name]
    );

    if (role === 'creator') {
      await connection.query(
        `INSERT INTO creator_profiles (user_id, public_name, payout_name, status)
         VALUES (?, ?, ?, 'active')`,
        [userId, full_name, full_name]
      );
    }

    await connection.commit();

    const [users] = await connection.query(
      `SELECT id, uuid, full_name, username, email, phone, status, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    const user = users[0];
    const token = signToken(user);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user,
      role: roleRow.name,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      message: 'Registration failed',
      error: error.message,
    });
  } finally {
    connection.release();
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const [users] = await pool.query(
      `SELECT id, uuid, full_name, username, email, phone, password_hash, status, created_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Account is not active',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    await pool.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = ?`,
      [user.id]
    );

    const roles = await resolveUserRoles(user.id);
    const token = signToken(user);

    delete user.password_hash;

    return res.json({
      message: 'Login successful',
      token,
      user,
      roles,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Login failed',
      error: error.message,
    });
  }
}

async function getMe(req, res) {
  try {
    const [users] = await pool.query(
      `SELECT id, uuid, full_name, username, email, phone, avatar_url, banner_url, bio, status, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const roles = await resolveUserRoles(req.user.id);

    return res.json({
      user: users[0],
      roles,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
};