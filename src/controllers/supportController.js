const db = require('../config/db');

function getUserRole(req) {
  if (req.user?.role) return req.user.role;

  if (Array.isArray(req.user?.roles) && req.user.roles.length) {
    if (req.user.roles.includes('admin')) return 'admin';
    if (req.user.roles.includes('creator')) return 'creator';
    return 'viewer';
  }

  return 'viewer';
}

async function getConversationRow(conversationId) {
  const [rows] = await db.query(
    `
      SELECT
        sc.id,
        sc.user_id,
        sc.assigned_admin_id,
        sc.subject,
        sc.status,
        sc.last_message_at,
        sc.created_at,
        sc.updated_at
      FROM support_conversations sc
      WHERE sc.id = ?
      LIMIT 1
    `,
    [conversationId]
  );

  return rows[0] || null;
}

async function getConversationMessages(conversationId) {
  const [rows] = await db.query(
    `
      SELECT
        sm.id,
        sm.conversation_id,
        sm.sender_user_id,
        sm.sender_role,
        sm.message_text,
        sm.is_read,
        sm.created_at,
        u.full_name,
        u.username,
        u.email
      FROM support_messages sm
      LEFT JOIN users u ON u.id = sm.sender_user_id
      WHERE sm.conversation_id = ?
      ORDER BY sm.created_at ASC, sm.id ASC
    `,
    [conversationId]
  );

  return rows;
}

async function createConversation(req, res) {
  try {
    const userId = req.user?.id;
    const senderRole = getUserRole(req);
    const subject = String(req.body?.subject || '').trim();
    const messageText = String(req.body?.message_text || '').trim();

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!subject) {
      return res.status(400).json({ message: 'Subject is required.' });
    }

    if (!messageText) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const [conversationResult] = await db.query(
      `
        INSERT INTO support_conversations (
          user_id,
          subject,
          status,
          last_message_at
        )
        VALUES (?, ?, 'open', NOW())
      `,
      [userId, subject]
    );

    const conversationId = conversationResult.insertId;

    await db.query(
      `
        INSERT INTO support_messages (
          conversation_id,
          sender_user_id,
          sender_role,
          message_text,
          is_read
        )
        VALUES (?, ?, ?, ?, 0)
      `,
      [conversationId, userId, senderRole, messageText]
    );

    const conversation = await getConversationRow(conversationId);
    const messages = await getConversationMessages(conversationId);

    return res.status(201).json({
      message: 'Support conversation created successfully.',
      conversation,
      messages,
    });
  } catch (error) {
    console.error('createConversation error:', error);
    return res.status(500).json({ message: 'Failed to create conversation.' });
  }
}

async function getMyConversations(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const [rows] = await db.query(
      `
        SELECT
          sc.id,
          sc.user_id,
          sc.assigned_admin_id,
          sc.subject,
          sc.status,
          sc.last_message_at,
          sc.created_at,
          sc.updated_at,
          (
            SELECT sm.message_text
            FROM support_messages sm
            WHERE sm.conversation_id = sc.id
            ORDER BY sm.created_at DESC, sm.id DESC
            LIMIT 1
          ) AS last_message_text,
          (
            SELECT COUNT(*)
            FROM support_messages sm
            WHERE sm.conversation_id = sc.id
              AND sm.sender_user_id <> ?
              AND sm.is_read = 0
          ) AS unread_count
        FROM support_conversations sc
        WHERE sc.user_id = ?
        ORDER BY
          COALESCE(sc.last_message_at, sc.created_at) DESC,
          sc.id DESC
      `,
      [userId, userId]
    );

    return res.status(200).json({
      conversations: rows,
    });
  } catch (error) {
    console.error('getMyConversations error:', error);
    return res.status(500).json({ message: 'Failed to fetch conversations.' });
  }
}

async function getConversationById(req, res) {
  try {
    const userId = req.user?.id;
    const userRole = getUserRole(req);
    const conversationId = Number(req.params?.conversationId);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const conversation = await getConversationRow(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    if (userRole !== 'admin' && Number(conversation.user_id) !== Number(userId)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const messages = await getConversationMessages(conversationId);

    return res.status(200).json({
      conversation,
      messages,
    });
  } catch (error) {
    console.error('getConversationById error:', error);
    return res.status(500).json({ message: 'Failed to fetch conversation.' });
  }
}

async function sendConversationMessage(req, res) {
  try {
    const userId = req.user?.id;
    const senderRole = getUserRole(req);
    const conversationId = Number(req.params?.conversationId);
    const messageText = String(req.body?.message_text || '').trim();

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!messageText) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const conversation = await getConversationRow(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    if (Number(conversation.user_id) !== Number(userId)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await db.query(
      `
        INSERT INTO support_messages (
          conversation_id,
          sender_user_id,
          sender_role,
          message_text,
          is_read
        )
        VALUES (?, ?, ?, ?, 0)
      `,
      [conversationId, userId, senderRole, messageText]
    );

    await db.query(
      `
        UPDATE support_conversations
        SET
          status = 'pending',
          last_message_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
      `,
      [conversationId]
    );

    const updatedConversation = await getConversationRow(conversationId);
    const messages = await getConversationMessages(conversationId);

    return res.status(201).json({
      message: 'Message sent successfully.',
      conversation: updatedConversation,
      messages,
    });
  } catch (error) {
    console.error('sendConversationMessage error:', error);
    return res.status(500).json({ message: 'Failed to send message.' });
  }
}

async function markConversationAsRead(req, res) {
  try {
    const userId = req.user?.id;
    const userRole = getUserRole(req);
    const conversationId = Number(req.params?.conversationId);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const conversation = await getConversationRow(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    if (userRole === 'admin') {
      await db.query(
        `
          UPDATE support_messages
          SET is_read = 1
          WHERE conversation_id = ?
            AND sender_user_id <> ?
            AND is_read = 0
        `,
        [conversationId, userId]
      );
    } else {
      if (Number(conversation.user_id) !== Number(userId)) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      await db.query(
        `
          UPDATE support_messages
          SET is_read = 1
          WHERE conversation_id = ?
            AND sender_user_id <> ?
            AND is_read = 0
        `,
        [conversationId, userId]
      );
    }

    return res.status(200).json({
      message: 'Conversation marked as read.',
    });
  } catch (error) {
    console.error('markConversationAsRead error:', error);
    return res.status(500).json({ message: 'Failed to mark conversation as read.' });
  }
}

async function getAdminConversations(req, res) {
  try {
    const status = String(req.query?.status || '').trim();
    const search = String(req.query?.search || '').trim();

    const params = [];
    const conditions = [];

    if (status && ['open', 'pending', 'closed'].includes(status)) {
      conditions.push('sc.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push(`
        (
          sc.subject LIKE ?
          OR u.full_name LIKE ?
          OR u.username LIKE ?
          OR u.email LIKE ?
        )
      `);
      const likeValue = `%${search}%`;
      params.push(likeValue, likeValue, likeValue, likeValue);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
        SELECT
          sc.id,
          sc.user_id,
          sc.assigned_admin_id,
          sc.subject,
          sc.status,
          sc.last_message_at,
          sc.created_at,
          sc.updated_at,
          u.full_name AS user_full_name,
          u.username AS user_username,
          u.email AS user_email,
          admin_u.full_name AS admin_full_name,
          admin_u.username AS admin_username,
          admin_u.email AS admin_email,
          (
            SELECT sm.message_text
            FROM support_messages sm
            WHERE sm.conversation_id = sc.id
            ORDER BY sm.created_at DESC, sm.id DESC
            LIMIT 1
          ) AS last_message_text,
          (
            SELECT COUNT(*)
            FROM support_messages sm
            WHERE sm.conversation_id = sc.id
              AND sm.is_read = 0
              AND sm.sender_role <> 'admin'
          ) AS unread_count
        FROM support_conversations sc
        LEFT JOIN users u ON u.id = sc.user_id
        LEFT JOIN users admin_u ON admin_u.id = sc.assigned_admin_id
        ${whereSql}
        ORDER BY
          COALESCE(sc.last_message_at, sc.created_at) DESC,
          sc.id DESC
      `,
      params
    );

    return res.status(200).json({
      conversations: rows,
    });
  } catch (error) {
    console.error('getAdminConversations error:', error);
    return res.status(500).json({ message: 'Failed to fetch admin conversations.' });
  }
}

async function getAdminConversationById(req, res) {
  try {
    const conversationId = Number(req.params?.conversationId);
    const conversation = await getConversationRow(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const [userRows] = await db.query(
      `
        SELECT id, full_name, username, email
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [conversation.user_id]
    );

    const messages = await getConversationMessages(conversationId);

    return res.status(200).json({
      conversation: {
        ...conversation,
        user: userRows[0] || null,
      },
      messages,
    });
  } catch (error) {
    console.error('getAdminConversationById error:', error);
    return res.status(500).json({ message: 'Failed to fetch admin conversation.' });
  }
}

async function sendAdminConversationMessage(req, res) {
  try {
    const adminUserId = req.user?.id;
    const conversationId = Number(req.params?.conversationId);
    const messageText = String(req.body?.message_text || '').trim();

    if (!adminUserId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!messageText) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const conversation = await getConversationRow(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    await db.query(
      `
        INSERT INTO support_messages (
          conversation_id,
          sender_user_id,
          sender_role,
          message_text,
          is_read
        )
        VALUES (?, ?, 'admin', ?, 0)
      `,
      [conversationId, adminUserId, messageText]
    );

    await db.query(
      `
        UPDATE support_conversations
        SET
          assigned_admin_id = ?,
          status = 'open',
          last_message_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
      `,
      [adminUserId, conversationId]
    );

    const updatedConversation = await getConversationRow(conversationId);
    const messages = await getConversationMessages(conversationId);

    return res.status(201).json({
      message: 'Admin reply sent successfully.',
      conversation: updatedConversation,
      messages,
    });
  } catch (error) {
    console.error('sendAdminConversationMessage error:', error);
    return res.status(500).json({ message: 'Failed to send admin reply.' });
  }
}

async function updateConversationStatus(req, res) {
  try {
    const conversationId = Number(req.params?.conversationId);
    const status = String(req.body?.status || '').trim();

    if (!['open', 'pending', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required.' });
    }

    const conversation = await getConversationRow(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    await db.query(
      `
        UPDATE support_conversations
        SET
          status = ?,
          updated_at = NOW()
        WHERE id = ?
      `,
      [status, conversationId]
    );

    const updatedConversation = await getConversationRow(conversationId);

    return res.status(200).json({
      message: 'Conversation status updated successfully.',
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error('updateConversationStatus error:', error);
    return res.status(500).json({ message: 'Failed to update conversation status.' });
  }
}

module.exports = {
  createConversation,
  getMyConversations,
  getConversationById,
  sendConversationMessage,
  markConversationAsRead,
  getAdminConversations,
  getAdminConversationById,
  sendAdminConversationMessage,
  updateConversationStatus,
};