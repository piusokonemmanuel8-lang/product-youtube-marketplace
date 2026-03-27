const path = require('path');
const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const pool = require('../config/db');
const s3 = require('../config/s3');

function normalizeBuyNowUrl(url) {
  if (url === undefined || url === null) {
    return undefined;
  }

  const trimmed = String(url).trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isSupgadUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(normalizeBuyNowUrl(url));
    const host = parsed.hostname.toLowerCase();

    return host === 'supgad.com' || host.endsWith('.supgad.com');
  } catch (error) {
    return false;
  }
}

async function getCreatorProfileByUserId(userId) {
  const [creatorProfiles] = await pool.query(
    'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );

  if (!creatorProfiles.length) {
    return null;
  }

  return creatorProfiles[0];
}

async function getMarketplaceAuthByCreatorId(creatorId) {
  const [rows] = await pool.query(
    'SELECT * FROM creator_marketplace_auth WHERE creator_id = ? LIMIT 1',
    [creatorId]
  );

  if (!rows.length) {
    return null;
  }

  return rows[0];
}

async function getActiveExternalPlanSubscription(creatorId) {
  const [rows] = await pool.query(
    `SELECT cps.*, epp.post_limit, epp.duration_days, epp.name AS plan_name
     FROM creator_plan_subscriptions cps
     INNER JOIN external_posting_plans epp ON cps.plan_id = epp.id
     WHERE cps.creator_id = ?
       AND cps.status = 'active'
       AND (cps.ends_at IS NULL OR cps.ends_at >= NOW())
     ORDER BY cps.id DESC
     LIMIT 1`,
    [creatorId]
  );

  if (!rows.length) {
    return null;
  }

  return rows[0];
}

async function consumeExternalPlanPostSlot(subscriptionId) {
  await pool.query(
    `UPDATE creator_plan_subscriptions
     SET posts_used = posts_used + 1
     WHERE id = ?`,
    [subscriptionId]
  );
}

async function validateExternalPlanAccess(creatorId) {
  const activeSubscription = await getActiveExternalPlanSubscription(creatorId);

  if (!activeSubscription) {
    return {
      allowed: false,
      statusCode: 402,
      message: 'No active external posting plan found',
    };
  }

  if (
    Number(activeSubscription.post_limit) > 0 &&
    Number(activeSubscription.posts_used) >= Number(activeSubscription.post_limit)
  ) {
    return {
      allowed: false,
      statusCode: 402,
      message: 'Your external posting plan post limit has been reached',
    };
  }

  return {
    allowed: true,
    subscription: activeSubscription,
  };
}

function canPostBuyNowLink(marketplaceAuth, buyNowUrl) {
  if (!buyNowUrl) {
    return {
      allowed: true,
      linkType: 'none',
    };
  }

  const linkIsSupgad = isSupgadUrl(buyNowUrl);

  if (linkIsSupgad) {
    if (
      marketplaceAuth &&
      marketplaceAuth.auth_type === 'supgad' &&
      Number(marketplaceAuth.is_authenticated) === 1 &&
      Number(marketplaceAuth.is_internal_supgad) === 1 &&
      Number(marketplaceAuth.payment_required) === 0
    ) {
      return {
        allowed: true,
        linkType: 'supgad',
      };
    }

    return {
      allowed: false,
      statusCode: 403,
      message: 'Supgad internal links require authenticated Supgad marketplace auth',
    };
  }

  if (!marketplaceAuth) {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Marketplace auth is required before posting external buy-now links',
    };
  }

  if (marketplaceAuth.auth_type !== 'external') {
    return {
      allowed: false,
      statusCode: 403,
      message: 'External buy-now links require external marketplace auth',
    };
  }

  if (Number(marketplaceAuth.payment_required) === 1) {
    return {
      allowed: false,
      statusCode: 402,
      message: 'External posting plan payment is required before posting external buy-now links',
    };
  }

  return {
    allowed: true,
    linkType: 'external',
  };
}

async function createModerationQueueItem({
  videoId,
  submittedBy,
  reason = 'video_upload',
}) {
  const [existingRows] = await pool.query(
    `SELECT id
     FROM moderation_queue
     WHERE video_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [videoId]
  );

  if (existingRows.length) {
    await pool.query(
      `UPDATE moderation_queue
       SET status = 'pending',
           reviewer_note = NULL,
           reviewed_at = NULL,
           reviewed_by = NULL,
           reason = ?
       WHERE id = ?`,
      [reason, existingRows[0].id]
    );

    return existingRows[0].id;
  }

  const [result] = await pool.query(
    `INSERT INTO moderation_queue
     (video_id, submitted_by, status, reason)
     VALUES (?, ?, 'pending', ?)`,
    [videoId, submittedBy, reason]
  );

  return result.insertId;
}

async function createVideoUploadUrl(req, res) {
  try {
    const userId = req.user.id;
    const { fileName, contentType, folder } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({
        message: 'fileName and contentType are required',
      });
    }

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can upload videos',
      });
    }

    const ext = path.extname(fileName) || '';
    const safeFolder = folder
      ? String(folder).trim().replace(/^\/+|\/+$/g, '')
      : 'videos';

    const objectKey = `${safeFolder}/${creatorProfile.id}/${Date.now()}-${crypto.randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    const fileUrl = process.env.AWS_CLOUDFRONT_URL
      ? `${process.env.AWS_CLOUDFRONT_URL.replace(/\/$/, '')}/${objectKey}`
      : `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${objectKey}`;

    return res.status(200).json({
      message: 'Upload URL created successfully',
      uploadUrl,
      key: objectKey,
      fileUrl,
      expiresIn: 900,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create upload URL',
      error: error.message,
    });
  }
}

async function createVideo(req, res) {
  try {
    const userId = req.user.id;
    const {
      channel_id,
      category_id,
      title,
      slug,
      description,
      video_type,
      source_type,
      storage_provider,
      video_key,
      stream_key,
      thumbnail_key,
      preview_key,
      duration_seconds,
      visibility,
      comments_enabled,
      buy_now_enabled,
      buy_now_url,
      is_monetized,
    } = req.body;

    if (!channel_id || !title || !slug) {
      return res.status(400).json({
        message: 'channel_id, title and slug are required',
      });
    }

    const cleanSlug = slug.trim().toLowerCase();
    const cleanBuyNowUrl = normalizeBuyNowUrl(buy_now_url);

    if (buy_now_enabled == 1 && cleanBuyNowUrl === null) {
      return res.status(400).json({
        message: 'buy_now_url is required when buy_now is enabled',
      });
    }

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can create videos',
      });
    }

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE id = ? AND creator_id = ? LIMIT 1',
      [channel_id, creatorProfile.id]
    );

    if (!channels.length) {
      return res.status(403).json({
        message: 'You can only upload videos to your own channel',
      });
    }

    const [existingSlug] = await pool.query(
      'SELECT id FROM videos WHERE slug = ? LIMIT 1',
      [cleanSlug]
    );

    if (existingSlug.length) {
      return res.status(409).json({
        message: 'Video slug already exists',
      });
    }

    const marketplaceAuth = await getMarketplaceAuthByCreatorId(creatorProfile.id);
    const postingCheck = canPostBuyNowLink(
      marketplaceAuth,
      buy_now_enabled == 1 ? cleanBuyNowUrl : null
    );

    if (!postingCheck.allowed) {
      return res.status(postingCheck.statusCode || 403).json({
        message: postingCheck.message,
      });
    }

    let externalPlanSubscription = null;

    if (postingCheck.linkType === 'external') {
      const planCheck = await validateExternalPlanAccess(creatorProfile.id);

      if (!planCheck.allowed) {
        return res.status(planCheck.statusCode || 402).json({
          message: planCheck.message,
        });
      }

      externalPlanSubscription = planCheck.subscription;
    }

    const videoUuid = crypto.randomUUID();

    const [result] = await pool.query(
      `INSERT INTO videos
      (
        uuid,
        creator_id,
        channel_id,
        category_id,
        title,
        slug,
        description,
        video_type,
        source_type,
        storage_provider,
        video_key,
        stream_key,
        thumbnail_key,
        preview_key,
        duration_seconds,
        visibility,
        status,
        moderation_status,
        comments_enabled,
        buy_now_enabled,
        buy_now_url,
        is_monetized
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        videoUuid,
        creatorProfile.id,
        channel_id,
        category_id || null,
        title.trim(),
        cleanSlug,
        description || null,
        video_type || 'long',
        source_type || 'uploaded',
        storage_provider || 's3',
        video_key || null,
        stream_key || null,
        thumbnail_key || null,
        preview_key || null,
        duration_seconds || 0,
        visibility || 'public',
        'draft',
        'pending',
        comments_enabled !== undefined ? comments_enabled : 1,
        buy_now_enabled !== undefined ? buy_now_enabled : 1,
        cleanBuyNowUrl !== undefined ? cleanBuyNowUrl : null,
        is_monetized !== undefined ? is_monetized : 0,
      ]
    );

    const videoId = result.insertId;

    await createModerationQueueItem({
      videoId,
      submittedBy: userId,
      reason: 'video_upload',
    });

    if (externalPlanSubscription) {
      await consumeExternalPlanPostSlot(externalPlanSubscription.id);
    }

    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE id = ? LIMIT 1',
      [videoId]
    );

    return res.status(201).json({
      message: 'Video created successfully and sent for moderation',
      video: videos[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create video',
      error: error.message,
    });
  }
}

async function getMyVideos(req, res) {
  try {
    const userId = req.user.id;

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can access videos',
      });
    }

    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE creator_id = ? ORDER BY id DESC',
      [creatorProfile.id]
    );

    return res.status(200).json({
      videos,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch videos',
      error: error.message,
    });
  }
}

async function getPublicVideos(req, res) {
  try {
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 24;

    const [videos] = await pool.query(
      `SELECT 
        v.*,
        c.channel_name,
        c.channel_handle,
        c.channel_slug
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.visibility = 'public'
         AND v.status = 'published'
         AND v.moderation_status = 'approved'
       ORDER BY 
         COALESCE(v.published_at, v.created_at) DESC,
         v.id DESC
       LIMIT ?`,
      [limit]
    );

    return res.status(200).json({
      videos,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch public videos',
      error: error.message,
    });
  }
}

async function getAdminVideos(req, res) {
  try {
    const status = req.query.status ? String(req.query.status).trim() : '';
    const moderationStatus = req.query.moderation_status
      ? String(req.query.moderation_status).trim()
      : '';
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 100;

    let sql = `
      SELECT
        v.*,
        c.channel_name,
        c.channel_handle,
        c.channel_slug
      FROM videos v
      LEFT JOIN channels c ON v.channel_id = c.id
      WHERE 1 = 1
    `;

    const params = [];

    if (status) {
      sql += ' AND v.status = ?';
      params.push(status);
    }

    if (moderationStatus) {
      sql += ' AND v.moderation_status = ?';
      params.push(moderationStatus);
    }

    sql += `
      ORDER BY COALESCE(v.published_at, v.created_at) DESC, v.id DESC
      LIMIT ?
    `;
    params.push(limit);

    const [videos] = await pool.query(sql, params);

    return res.status(200).json({
      videos,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch admin videos',
      error: error.message,
    });
  }
}

async function getAdminVideoById(req, res) {
  try {
    const { id } = req.params;

    const [videos] = await pool.query(
      `SELECT
        v.*,
        c.channel_name,
        c.channel_handle,
        c.channel_slug
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.id = ?
       LIMIT 1`,
      [id]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    return res.status(200).json({
      video: videos[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch admin video',
      error: error.message,
    });
  }
}

async function updateAdminVideoStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, moderation_status, visibility, published_at, reviewer_note } = req.body;

    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE id = ? LIMIT 1',
      [id]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const currentVideo = videos[0];

    const finalStatus = status || currentVideo.status;
    const finalModerationStatus = moderation_status || currentVideo.moderation_status;
    const finalVisibility = visibility || currentVideo.visibility;

    let finalPublishedAt = currentVideo.published_at;

    if (published_at !== undefined) {
      finalPublishedAt = published_at;
    } else if (finalStatus === 'published' && !currentVideo.published_at) {
      finalPublishedAt = new Date();
    }

    await pool.query(
      `UPDATE videos
       SET status = ?, moderation_status = ?, visibility = ?, published_at = ?
       WHERE id = ?`,
      [
        finalStatus,
        finalModerationStatus,
        finalVisibility,
        finalPublishedAt,
        currentVideo.id,
      ]
    );

    if (finalModerationStatus === 'approved' || finalModerationStatus === 'rejected') {
      await pool.query(
        `UPDATE moderation_queue
         SET status = ?,
             reviewer_note = ?,
             reviewed_at = NOW(),
             reviewed_by = ?
         WHERE video_id = ?
           AND status = 'pending'`,
        [
          finalModerationStatus,
          reviewer_note || null,
          req.user.id,
          currentVideo.id,
        ]
      );
    }

    const [updatedVideos] = await pool.query(
      'SELECT * FROM videos WHERE id = ? LIMIT 1',
      [currentVideo.id]
    );

    return res.status(200).json({
      message: 'Admin video status updated successfully',
      video: updatedVideos[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update admin video status',
      error: error.message,
    });
  }
}

async function getVideoBySlug(req, res) {
  try {
    const { slug } = req.params;

    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE slug = ? LIMIT 1',
      [slug]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    return res.status(200).json({
      video: videos[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch video',
      error: error.message,
    });
  }
}

async function updateMyVideo(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      channel_id,
      category_id,
      title,
      slug,
      description,
      video_type,
      source_type,
      storage_provider,
      video_key,
      stream_key,
      thumbnail_key,
      preview_key,
      duration_seconds,
      visibility,
      status,
      moderation_status,
      comments_enabled,
      buy_now_enabled,
      buy_now_url,
      is_monetized,
      published_at,
    } = req.body;

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can update videos',
      });
    }

    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE id = ? AND creator_id = ? LIMIT 1',
      [id, creatorProfile.id]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const currentVideo = videos[0];

    let finalSlug = currentVideo.slug;

    if (slug) {
      finalSlug = slug.trim().toLowerCase();

      const [existingSlug] = await pool.query(
        'SELECT id FROM videos WHERE slug = ? AND id != ? LIMIT 1',
        [finalSlug, currentVideo.id]
      );

      if (existingSlug.length) {
        return res.status(409).json({
          message: 'Video slug already exists',
        });
      }
    }

    const finalChannelId = channel_id || currentVideo.channel_id;

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE id = ? AND creator_id = ? LIMIT 1',
      [finalChannelId, creatorProfile.id]
    );

    if (!channels.length) {
      return res.status(403).json({
        message: 'You can only assign videos to your own channel',
      });
    }

    const cleanBuyNowUrl = normalizeBuyNowUrl(buy_now_url);

    let finalBuyNowUrl = currentVideo.buy_now_url;

    if (cleanBuyNowUrl !== undefined) {
      finalBuyNowUrl = cleanBuyNowUrl;
    }

    const finalBuyNowEnabled =
      buy_now_enabled !== undefined ? buy_now_enabled : currentVideo.buy_now_enabled;

    if (finalBuyNowEnabled == 1 && !finalBuyNowUrl) {
      return res.status(400).json({
        message: 'buy_now_url is required when buy_now is enabled',
      });
    }

    const marketplaceAuth = await getMarketplaceAuthByCreatorId(creatorProfile.id);
    const postingCheck = canPostBuyNowLink(
      marketplaceAuth,
      finalBuyNowEnabled == 1 ? finalBuyNowUrl : null
    );

    if (!postingCheck.allowed) {
      return res.status(postingCheck.statusCode || 403).json({
        message: postingCheck.message,
      });
    }

    const currentVideoUsesExternalLink =
      currentVideo.buy_now_enabled == 1 &&
      currentVideo.buy_now_url &&
      !isSupgadUrl(currentVideo.buy_now_url);

    const finalVideoUsesExternalLink =
      finalBuyNowEnabled == 1 &&
      finalBuyNowUrl &&
      !isSupgadUrl(finalBuyNowUrl);

    let externalPlanSubscription = null;

    if (finalVideoUsesExternalLink && !currentVideoUsesExternalLink) {
      const planCheck = await validateExternalPlanAccess(creatorProfile.id);

      if (!planCheck.allowed) {
        return res.status(planCheck.statusCode || 402).json({
          message: planCheck.message,
        });
      }

      externalPlanSubscription = planCheck.subscription;
    }

    await pool.query(
      `UPDATE videos
       SET channel_id = ?, category_id = ?, title = ?, slug = ?, description = ?, video_type = ?, source_type = ?, storage_provider = ?, video_key = ?, stream_key = ?, thumbnail_key = ?, preview_key = ?, duration_seconds = ?, visibility = ?, status = ?, moderation_status = ?, comments_enabled = ?, buy_now_enabled = ?, buy_now_url = ?, is_monetized = ?, published_at = ?
       WHERE id = ?`,
      [
        finalChannelId,
        category_id !== undefined ? category_id : currentVideo.category_id,
        title ? title.trim() : currentVideo.title,
        finalSlug,
        description !== undefined ? description : currentVideo.description,
        video_type || currentVideo.video_type,
        source_type || currentVideo.source_type,
        storage_provider || currentVideo.storage_provider,
        video_key !== undefined ? video_key : currentVideo.video_key,
        stream_key !== undefined ? stream_key : currentVideo.stream_key,
        thumbnail_key !== undefined ? thumbnail_key : currentVideo.thumbnail_key,
        preview_key !== undefined ? preview_key : currentVideo.preview_key,
        duration_seconds !== undefined ? duration_seconds : currentVideo.duration_seconds,
        visibility || currentVideo.visibility,
        status || currentVideo.status,
        moderation_status || currentVideo.moderation_status,
        comments_enabled !== undefined ? comments_enabled : currentVideo.comments_enabled,
        finalBuyNowEnabled,
        finalBuyNowUrl,
        is_monetized !== undefined ? is_monetized : currentVideo.is_monetized,
        published_at !== undefined ? published_at : currentVideo.published_at,
        currentVideo.id,
      ]
    );

    const finalStatusValue = status || currentVideo.status;
    const finalModerationStatusValue = moderation_status || currentVideo.moderation_status;

    const shouldReturnToQueue =
      finalStatusValue === 'draft' && finalModerationStatusValue === 'pending';

    if (shouldReturnToQueue) {
      await createModerationQueueItem({
        videoId: currentVideo.id,
        submittedBy: userId,
        reason: 'video_update',
      });
    }

    if (externalPlanSubscription) {
      await consumeExternalPlanPostSlot(externalPlanSubscription.id);
    }

    const [updatedVideos] = await pool.query(
      'SELECT * FROM videos WHERE id = ? LIMIT 1',
      [currentVideo.id]
    );

    return res.status(200).json({
      message: 'Video updated successfully',
      video: updatedVideos[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update video',
      error: error.message,
    });
  }
}

async function deleteMyVideo(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const creatorProfile = await getCreatorProfileByUserId(userId);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can delete videos',
      });
    }

    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE id = ? AND creator_id = ? LIMIT 1',
      [id, creatorProfile.id]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    await pool.query('DELETE FROM moderation_queue WHERE video_id = ?', [videos[0].id]);
    await pool.query('DELETE FROM videos WHERE id = ?', [videos[0].id]);

    return res.status(200).json({
      message: 'Video deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete video',
      error: error.message,
    });
  }
}

async function deleteAdminVideo(req, res) {
  try {
    const { id } = req.params;

    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE id = ? LIMIT 1',
      [id]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    await pool.query('DELETE FROM moderation_queue WHERE video_id = ?', [videos[0].id]);
    await pool.query('DELETE FROM videos WHERE id = ?', [videos[0].id]);

    return res.status(200).json({
      message: 'Admin video deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete admin video',
      error: error.message,
    });
  }
}

module.exports = {
  createVideoUploadUrl,
  createVideo,
  getMyVideos,
  getPublicVideos,
  getAdminVideos,
  getAdminVideoById,
  updateAdminVideoStatus,
  getVideoBySlug,
  updateMyVideo,
  deleteMyVideo,
  deleteAdminVideo,
};