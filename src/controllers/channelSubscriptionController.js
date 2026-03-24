const pool = require('../config/db');

async function subscribeToChannel(req, res) {
  try {
    const userId = req.user.id;
    const { channelId } = req.params;

    const [channels] = await pool.query(
      'SELECT id, creator_id FROM channels WHERE id = ? LIMIT 1',
      [channelId]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    const channel = channels[0];

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (creatorProfiles.length && Number(creatorProfiles[0].id) === Number(channel.creator_id)) {
      return res.status(400).json({
        message: 'You cannot subscribe to your own channel',
      });
    }

    const [existingSubscriptions] = await pool.query(
      'SELECT id FROM channel_subscriptions WHERE channel_id = ? AND user_id = ? LIMIT 1',
      [channelId, userId]
    );

    if (existingSubscriptions.length) {
      return res.status(200).json({
        message: 'Already subscribed to this channel',
      });
    }

    await pool.query(
      'INSERT INTO channel_subscriptions (channel_id, user_id) VALUES (?, ?)',
      [channelId, userId]
    );

    return res.status(201).json({
      message: 'Subscribed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to subscribe to channel',
      error: error.message,
    });
  }
}

async function unsubscribeFromChannel(req, res) {
  try {
    const userId = req.user.id;
    const { channelId } = req.params;

    const [existingSubscriptions] = await pool.query(
      'SELECT id FROM channel_subscriptions WHERE channel_id = ? AND user_id = ? LIMIT 1',
      [channelId, userId]
    );

    if (!existingSubscriptions.length) {
      return res.status(404).json({
        message: 'Subscription not found',
      });
    }

    await pool.query(
      'DELETE FROM channel_subscriptions WHERE id = ?',
      [existingSubscriptions[0].id]
    );

    return res.status(200).json({
      message: 'Unsubscribed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to unsubscribe from channel',
      error: error.message,
    });
  }
}

async function getChannelSubscriptionSummary(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const { channelId } = req.params;

    const [channels] = await pool.query(
      'SELECT id FROM channels WHERE id = ? LIMIT 1',
      [channelId]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM channel_subscriptions WHERE channel_id = ?',
      [channelId]
    );

    let isSubscribed = false;

    if (userId) {
      const [subscriptionRows] = await pool.query(
        'SELECT id FROM channel_subscriptions WHERE channel_id = ? AND user_id = ? LIMIT 1',
        [channelId, userId]
      );

      isSubscribed = subscriptionRows.length > 0;
    }

    return res.status(200).json({
      channel_id: Number(channelId),
      subscribers_count: countRows[0].count,
      is_subscribed: isSubscribed,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch channel subscription summary',
      error: error.message,
    });
  }
}

module.exports = {
  subscribeToChannel,
  unsubscribeFromChannel,
  getChannelSubscriptionSummary,
};