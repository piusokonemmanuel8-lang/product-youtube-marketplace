console.log('LOADED CHANNEL CONTROLLER FILE');
const pool = require('../config/db');

async function createChannel(req, res) {
  try {
    const userId = req.user.id;
    const { channel_name, channel_handle, channel_slug, avatar_url, banner_url, bio } = req.body;

    if (!channel_name || !channel_handle || !channel_slug) {
      return res.status(400).json({
        message: 'channel_name, channel_handle and channel_slug are required',
      });
    }

    const cleanHandle = channel_handle.trim().toLowerCase();
    const cleanSlug = channel_slug.trim().toLowerCase();

    const [creatorProfiles] = await pool.query(
      'SELECT id, user_id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(403).json({
        message: 'Only creators can create channels',
      });
    }

    const creatorProfile = creatorProfiles[0];

    const [existingHandle] = await pool.query(
      'SELECT id FROM channels WHERE channel_handle = ? LIMIT 1',
      [cleanHandle]
    );

    if (existingHandle.length) {
      return res.status(409).json({
        message: 'Channel handle already exists',
      });
    }

    const [existingSlug] = await pool.query(
      'SELECT id FROM channels WHERE channel_slug = ? LIMIT 1',
      [cleanSlug]
    );

    if (existingSlug.length) {
      return res.status(409).json({
        message: 'Channel slug already exists',
      });
    }

    const [existingCreatorChannel] = await pool.query(
      'SELECT id FROM channels WHERE creator_id = ? LIMIT 1',
      [creatorProfile.id]
    );

    if (existingCreatorChannel.length) {
      return res.status(409).json({
        message: 'Creator already has a channel',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO channels
      (creator_id, channel_name, channel_handle, channel_slug, avatar_url, banner_url, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        creatorProfile.id,
        channel_name.trim(),
        cleanHandle,
        cleanSlug,
        avatar_url || null,
        banner_url || null,
        bio || null,
      ]
    );

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Channel created successfully',
      channel: channels[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create channel',
      error: error.message,
    });
  }
}

async function getMyChannel(req, res) {
  try {
    const userId = req.user.id;

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(403).json({
        message: 'Only creators can access channel data',
      });
    }

    const creatorProfile = creatorProfiles[0];

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE creator_id = ? LIMIT 1',
      [creatorProfile.id]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    return res.status(200).json({
      channel: channels[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch channel',
      error: error.message,
    });
  }
}

async function updateMyChannel(req, res) {
  try {
    const userId = req.user.id;
    const { channel_name, channel_handle, channel_slug, avatar_url, banner_url, bio, status } = req.body;

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(403).json({
        message: 'Only creators can update channel data',
      });
    }

    const creatorProfile = creatorProfiles[0];

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE creator_id = ? LIMIT 1',
      [creatorProfile.id]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    const currentChannel = channels[0];

    let finalHandle = currentChannel.channel_handle;
    let finalSlug = currentChannel.channel_slug;

    if (channel_handle) {
      finalHandle = channel_handle.trim().toLowerCase();

      const [existingHandle] = await pool.query(
        'SELECT id FROM channels WHERE channel_handle = ? AND id != ? LIMIT 1',
        [finalHandle, currentChannel.id]
      );

      if (existingHandle.length) {
        return res.status(409).json({
          message: 'Channel handle already exists',
        });
      }
    }

    if (channel_slug) {
      finalSlug = channel_slug.trim().toLowerCase();

      const [existingSlug] = await pool.query(
        'SELECT id FROM channels WHERE channel_slug = ? AND id != ? LIMIT 1',
        [finalSlug, currentChannel.id]
      );

      if (existingSlug.length) {
        return res.status(409).json({
          message: 'Channel slug already exists',
        });
      }
    }

    const finalName = channel_name ? channel_name.trim() : currentChannel.channel_name;

    await pool.query(
      `UPDATE channels
       SET channel_name = ?, channel_handle = ?, channel_slug = ?, avatar_url = ?, banner_url = ?, bio = ?, status = ?
       WHERE id = ?`,
      [
        finalName,
        finalHandle,
        finalSlug,
        avatar_url !== undefined ? avatar_url : currentChannel.avatar_url,
        banner_url !== undefined ? banner_url : currentChannel.banner_url,
        bio !== undefined ? bio : currentChannel.bio,
        status || currentChannel.status,
        currentChannel.id,
      ]
    );

    const [updatedChannels] = await pool.query(
      'SELECT * FROM channels WHERE id = ? LIMIT 1',
      [currentChannel.id]
    );

    return res.status(200).json({
      message: 'Channel updated successfully',
      channel: updatedChannels[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update channel',
      error: error.message,
    });
  }
}

async function getChannelBySlug(req, res) {
  try {
    const { slug } = req.params;

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE channel_slug = ? LIMIT 1',
      [slug]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    return res.status(200).json({
      channel: channels[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch public channel',
      error: error.message,
    });
  }
}

async function deleteMyChannel(req, res) {
  try {
    const userId = req.user.id;

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(403).json({
        message: 'Only creators can delete channels',
      });
    }

    const creatorProfile = creatorProfiles[0];

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE creator_id = ? LIMIT 1',
      [creatorProfile.id]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    await pool.query(
      'DELETE FROM channels WHERE id = ?',
      [channels[0].id]
    );

    return res.status(200).json({
      message: 'Channel deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete channel',
      error: error.message,
    });
  }
}

async function getAdminChannels(req, res) {
  try {
    const status = req.query.status ? String(req.query.status).trim() : '';
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 100;

    let sql = `
      SELECT
        ch.*,
        cp.user_id,
        u.full_name,
        u.email,
        u.username
      FROM channels ch
      LEFT JOIN creator_profiles cp ON ch.creator_id = cp.id
      LEFT JOIN users u ON cp.user_id = u.id
      WHERE 1 = 1
    `;

    const params = [];

    if (status) {
      sql += ' AND ch.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY ch.id DESC LIMIT ?';
    params.push(limit);

    const [channels] = await pool.query(sql, params);

    return res.status(200).json({
      channels,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch admin channels',
      error: error.message,
    });
  }
}

async function getAdminChannelById(req, res) {
  try {
    const { id } = req.params;

    const [channels] = await pool.query(
      `SELECT
        ch.*,
        cp.user_id,
        u.full_name,
        u.email,
        u.username
       FROM channels ch
       LEFT JOIN creator_profiles cp ON ch.creator_id = cp.id
       LEFT JOIN users u ON cp.user_id = u.id
       WHERE ch.id = ?
       LIMIT 1`,
      [id]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    return res.status(200).json({
      channel: channels[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch admin channel',
      error: error.message,
    });
  }
}

async function updateAdminChannel(req, res) {
  try {
    const { id } = req.params;
    const { channel_name, channel_handle, channel_slug, avatar_url, banner_url, bio, status } = req.body;

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE id = ? LIMIT 1',
      [id]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    const currentChannel = channels[0];

    let finalHandle = currentChannel.channel_handle;
    let finalSlug = currentChannel.channel_slug;

    if (channel_handle) {
      finalHandle = channel_handle.trim().toLowerCase();

      const [existingHandle] = await pool.query(
        'SELECT id FROM channels WHERE channel_handle = ? AND id != ? LIMIT 1',
        [finalHandle, currentChannel.id]
      );

      if (existingHandle.length) {
        return res.status(409).json({
          message: 'Channel handle already exists',
        });
      }
    }

    if (channel_slug) {
      finalSlug = channel_slug.trim().toLowerCase();

      const [existingSlug] = await pool.query(
        'SELECT id FROM channels WHERE channel_slug = ? AND id != ? LIMIT 1',
        [finalSlug, currentChannel.id]
      );

      if (existingSlug.length) {
        return res.status(409).json({
          message: 'Channel slug already exists',
        });
      }
    }

    const finalName = channel_name ? channel_name.trim() : currentChannel.channel_name;

    await pool.query(
      `UPDATE channels
       SET channel_name = ?, channel_handle = ?, channel_slug = ?, avatar_url = ?, banner_url = ?, bio = ?, status = ?
       WHERE id = ?`,
      [
        finalName,
        finalHandle,
        finalSlug,
        avatar_url !== undefined ? avatar_url : currentChannel.avatar_url,
        banner_url !== undefined ? banner_url : currentChannel.banner_url,
        bio !== undefined ? bio : currentChannel.bio,
        status || currentChannel.status,
        currentChannel.id,
      ]
    );

    const [updatedChannels] = await pool.query(
      'SELECT * FROM channels WHERE id = ? LIMIT 1',
      [currentChannel.id]
    );

    return res.status(200).json({
      message: 'Admin channel updated successfully',
      channel: updatedChannels[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update admin channel',
      error: error.message,
    });
  }
}

async function deleteAdminChannel(req, res) {
  try {
    const { id } = req.params;

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE id = ? LIMIT 1',
      [id]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    await pool.query('DELETE FROM channels WHERE id = ?', [channels[0].id]);

    return res.status(200).json({
      message: 'Admin channel deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete admin channel',
      error: error.message,
    });
  }
}

module.exports = {
  createChannel,
  getMyChannel,
  updateMyChannel,
  getChannelBySlug,
  deleteMyChannel,
  getAdminChannels,
  getAdminChannelById,
  updateAdminChannel,
  deleteAdminChannel,
};