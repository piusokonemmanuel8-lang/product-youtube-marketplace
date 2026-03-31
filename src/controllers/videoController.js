const path = require('path');
const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const pool = require('../config/db');
const s3 = require('../config/s3');
const {
  ensureLatestSubscriptionState,
} = require('./externalPostingPlanController');

const S3_BUCKET_NAME =
  process.env.AWS_S3_BUCKET ||
  process.env.AWS_S3_BUCKET_NAME ||
  process.env.AWS_BUCKET_NAME ||
  process.env.AWS_BUCKET ||
  '';

const S3_REGION =
  process.env.AWS_REGION ||
  process.env.AWS_S3_REGION ||
  'us-east-1';

const CLOUDFRONT_URL =
  process.env.AWS_CLOUDFRONT_URL ||
  process.env.CLOUDFRONT_URL ||
  '';

function buildMediaUrl(key) {
  if (!key) {
    return null;
  }

  if (/^https?:\/\//i.test(key)) {
    return key;
  }

  const cleanKey = String(key).replace(/^\/+/, '');

  if (CLOUDFRONT_URL) {
    return `${CLOUDFRONT_URL.replace(/\/$/, '')}/${cleanKey}`;
  }

  if (S3_BUCKET_NAME) {
    return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${cleanKey}`;
  }

  return cleanKey;
}

function resolveVideoFormat(durationSeconds) {
  const seconds = Number(durationSeconds || 0);
  return seconds > 0 && seconds <= 60 ? 'short' : 'regular';
}

function normalizeVideoRow(video) {
  if (!video) return video;

  const resolvedViews =
    video.views_count ??
    video.total_views ??
    video.views ??
    video.view_count ??
    0;

  const resolvedDuration = Number(video.duration_seconds || 0);
  const resolvedVideoFormat =
    video.video_format ||
    resolveVideoFormat(resolvedDuration);

  const resolvedShortThumbnailKey =
    video.short_thumbnail_key || null;

  return {
    ...video,
    video_url: video.video_url || buildMediaUrl(video.video_key),
    thumbnail_url: video.thumbnail_url || buildMediaUrl(video.thumbnail_key),
    short_thumbnail_url:
      video.short_thumbnail_url ||
      buildMediaUrl(resolvedShortThumbnailKey) ||
      buildMediaUrl(video.thumbnail_key),
    preview_url: video.preview_url || buildMediaUrl(video.preview_key),
    views_count: Number(resolvedViews || 0),
    total_views: Number(resolvedViews || 0),
    views: Number(resolvedViews || 0),
    duration_seconds: resolvedDuration,
    video_format: resolvedVideoFormat,
    is_short: resolvedVideoFormat === 'short' ? 1 : 0,
    short_thumbnail_key: resolvedShortThumbnailKey,
    uses_external_link: Number(video.uses_external_link || 0),
    external_link_subscription_required: Number(video.external_link_subscription_required || 0),
  };
}

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

function isSupgadMarketplaceAuthActive(marketplaceAuth) {
  if (!marketplaceAuth) {
    return false;
  }

  const authType = String(marketplaceAuth.auth_type || '').toLowerCase();
  const supgadStatus = String(marketplaceAuth.supgad_status || '').toLowerCase();
  const authStoreUrl = String(marketplaceAuth.supgad_store_url || '').toLowerCase();

  return (
    authType === 'supgad' ||
    Number(marketplaceAuth.is_authenticated) === 1 ||
    marketplaceAuth.is_authenticated === true ||
    Number(marketplaceAuth.is_internal_supgad) === 1 ||
    marketplaceAuth.is_internal_supgad === true ||
    supgadStatus === 'active' ||
    authStoreUrl.includes('supgad.com')
  );
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

async function isCreatorMonetized(creatorId) {
  const [rows] = await pool.query(
    `SELECT
       cp.monetization_status,
       cms.is_monetized
     FROM creator_profiles cp
     LEFT JOIN creator_monetization_status cms ON cms.creator_id = cp.id
     WHERE cp.id = ?
     LIMIT 1`,
    [creatorId]
  );

  if (!rows.length) {
    return false;
  }

  const row = rows[0];

  return (
    Number(row.is_monetized || 0) === 1 ||
    String(row.monetization_status || '').toLowerCase() === 'approved'
  );
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
  await ensureLatestSubscriptionState(creatorId);

  const [rows] = await pool.query(
    `SELECT cps.*, epp.video_limit_per_month, epp.duration_days, epp.name AS plan_name
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
     SET videos_used_this_cycle = videos_used_this_cycle + 1
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
      message: 'Subscribe to a plan to post external product links.',
    };
  }

  if (
    Number(activeSubscription.video_limit_per_month) > 0 &&
    Number(activeSubscription.videos_used_this_cycle) >=
      Number(activeSubscription.video_limit_per_month)
  ) {
    return {
      allowed: false,
      statusCode: 402,
      message:
        'You have reached your plan limit. Upgrade your subscription to upload more videos.',
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
    if (isSupgadMarketplaceAuthActive(marketplaceAuth)) {
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
      statusCode: 402,
      message: 'Subscribe to a plan to post external product links.',
    };
  }

  if (String(marketplaceAuth.auth_type || '').toLowerCase() !== 'external') {
    return {
      allowed: false,
      statusCode: 402,
      message: 'Subscribe to a plan to post external product links.',
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
       SET entity_type = 'video',
           entity_id = ?,
           moderation_status = 'pending',
           reason = ?,
           reviewed_by = NULL,
           reviewed_at = NULL
       WHERE id = ?`,
      [submittedBy, reason, existingRows[0].id]
    );

    return existingRows[0].id;
  }

  const [result] = await pool.query(
    `INSERT INTO moderation_queue
     (video_id, entity_type, entity_id, moderation_status, reason, reviewed_by, reviewed_at)
     VALUES (?, 'video', ?, 'pending', ?, NULL, NULL)`,
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
        message: 'Only creators can upload files',
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
    const fileUrl = buildMediaUrl(objectKey);

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
      short_thumbnail_key,
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

    if (!thumbnail_key) {
      return res.status(400).json({
        message: 'Thumbnail is required',
      });
    }

    if (!short_thumbnail_key) {
      return res.status(400).json({
        message: 'Short thumbnail is required',
      });
    }

    const cleanSlug = slug.trim().toLowerCase();
    const cleanBuyNowUrl = normalizeBuyNowUrl(buy_now_url);
    const finalDurationSeconds = Number(duration_seconds || 0);
    const finalVideoFormat = resolveVideoFormat(finalDurationSeconds);

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

    const creatorCanChooseVideoMonetization = await isCreatorMonetized(
      creatorProfile.id
    );
    const finalIsMonetized =
      creatorCanChooseVideoMonetization && Number(is_monetized || 0) === 1 ? 1 : 0;

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

    const usesExternalLink =
      buy_now_enabled == 1 && cleanBuyNowUrl && !isSupgadUrl(cleanBuyNowUrl);

    let externalPlanSubscription = null;

    if (usesExternalLink) {
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
        video_format,
        source_type,
        storage_provider,
        video_key,
        stream_key,
        thumbnail_key,
        short_thumbnail_key,
        preview_key,
        duration_seconds,
        visibility,
        status,
        moderation_status,
        comments_enabled,
        buy_now_enabled,
        buy_now_url,
        uses_external_link,
        external_link_subscription_required,
        is_monetized
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        videoUuid,
        creatorProfile.id,
        channel_id,
        category_id || null,
        title.trim(),
        cleanSlug,
        description || null,
        video_type || 'long',
        finalVideoFormat,
        source_type || 'uploaded',
        storage_provider || 's3',
        video_key || null,
        stream_key || null,
        thumbnail_key || null,
        short_thumbnail_key || null,
        preview_key || null,
        finalDurationSeconds,
        visibility || 'public',
        'draft',
        'pending',
        comments_enabled !== undefined ? comments_enabled : 1,
        buy_now_enabled !== undefined ? buy_now_enabled : 1,
        cleanBuyNowUrl !== undefined ? cleanBuyNowUrl : null,
        usesExternalLink ? 1 : 0,
        usesExternalLink ? 1 : 0,
        finalIsMonetized,
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
      video: normalizeVideoRow(videos[0]),
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
      `SELECT
        v.*,
        c.channel_name,
        c.channel_handle,
        c.channel_slug
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.creator_id = ?
       ORDER BY v.id DESC`,
      [creatorProfile.id]
    );

    return res.status(200).json({
      videos: videos.map(normalizeVideoRow),
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
    const videoFormat = req.query.video_format
      ? String(req.query.video_format).trim().toLowerCase()
      : '';

    let sql = `
      SELECT
        v.id,
        v.uuid,
        v.creator_id,
        v.channel_id,
        v.category_id,
        v.title,
        v.slug,
        v.description,
        v.video_type,
        v.video_format,
        v.source_type,
        v.storage_provider,
        v.video_key,
        v.stream_key,
        v.thumbnail_key,
        v.short_thumbnail_key,
        v.preview_key,
        v.duration_seconds,
        v.visibility,
        v.status,
        v.moderation_status,
        v.comments_enabled,
        v.buy_now_enabled,
        v.buy_now_url,
        v.uses_external_link,
        v.external_link_subscription_required,
        v.subscription_unpublished_at,
        v.subscription_republished_at,
        v.is_monetized,
        v.published_at,
        v.created_at,
        v.updated_at,
        c.channel_name,
        c.channel_handle,
        c.channel_slug,
        COALESCE(vv.total_views, 0) AS views_count
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       LEFT JOIN (
         SELECT video_id, COUNT(*) AS total_views
         FROM video_views
         GROUP BY video_id
       ) vv ON vv.video_id = v.id
       WHERE v.visibility = 'public'
         AND v.status = 'published'
         AND v.moderation_status = 'approved'
    `;

    const params = [];

    if (videoFormat === 'short' || videoFormat === 'regular') {
      sql +=
        " AND COALESCE(v.video_format, CASE WHEN COALESCE(v.duration_seconds, 0) <= 60 AND COALESCE(v.duration_seconds, 0) > 0 THEN 'short' ELSE 'regular' END) = ?";
      params.push(videoFormat);
    }

    sql += `
       ORDER BY COALESCE(v.published_at, v.created_at) DESC, v.id DESC
       LIMIT ?
    `;
    params.push(limit);

    const [videos] = await pool.query(sql, params);

    return res.status(200).json({
      videos: videos.map((video) =>
        normalizeVideoRow({
          id: video.id,
          uuid: video.uuid,
          creator_id: video.creator_id,
          channel_id: video.channel_id,
          category_id: video.category_id,
          title: video.title,
          slug: video.slug,
          description: video.description,
          video_type: video.video_type,
          video_format: video.video_format,
          source_type: video.source_type,
          storage_provider: video.storage_provider,
          video_key: video.video_key,
          stream_key: video.stream_key,
          thumbnail_key: video.thumbnail_key,
          short_thumbnail_key: video.short_thumbnail_key,
          preview_key: video.preview_key,
          duration_seconds: video.duration_seconds,
          visibility: video.visibility,
          status: video.status,
          moderation_status: video.moderation_status,
          comments_enabled: video.comments_enabled,
          buy_now_enabled: video.buy_now_enabled,
          buy_now_url: video.buy_now_url,
          uses_external_link: Number(video.uses_external_link || 0),
          external_link_subscription_required: Number(
            video.external_link_subscription_required || 0
          ),
          subscription_unpublished_at: video.subscription_unpublished_at,
          subscription_republished_at: video.subscription_republished_at,
          is_monetized: video.is_monetized,
          published_at: video.published_at,
          created_at: video.created_at,
          updated_at: video.updated_at,
          channel_name: video.channel_name,
          channel_handle: video.channel_handle,
          channel_slug: video.channel_slug,
          video_url: buildMediaUrl(video.video_key),
          thumbnail_url: buildMediaUrl(video.thumbnail_key),
          short_thumbnail_url:
            buildMediaUrl(video.short_thumbnail_key) ||
            buildMediaUrl(video.thumbnail_key),
          preview_url: buildMediaUrl(video.preview_key),
          views_count: Number(video.views_count || 0),
          total_views: Number(video.views_count || 0),
          views: Number(video.views_count || 0),
        })
      ),
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
    const videoFormat = req.query.video_format
      ? String(req.query.video_format).trim().toLowerCase()
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

    if (videoFormat === 'short' || videoFormat === 'regular') {
      sql +=
        " AND COALESCE(v.video_format, CASE WHEN COALESCE(v.duration_seconds, 0) <= 60 AND COALESCE(v.duration_seconds, 0) > 0 THEN 'short' ELSE 'regular' END) = ?";
      params.push(videoFormat);
    }

    sql += `
      ORDER BY COALESCE(v.published_at, v.created_at) DESC, v.id DESC
      LIMIT ?
    `;
    params.push(limit);

    const [videos] = await pool.query(sql, params);

    return res.status(200).json({
      videos: videos.map(normalizeVideoRow),
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
      video: normalizeVideoRow(videos[0]),
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
    const { status, moderation_status, visibility, published_at, reviewer_note } =
      req.body;

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

    if (
      finalModerationStatus === 'approved' ||
      finalModerationStatus === 'rejected'
    ) {
      await pool.query(
        `UPDATE moderation_queue
         SET moderation_status = ?,
             reason = ?,
             reviewed_at = NOW(),
             reviewed_by = ?
         WHERE video_id = ?
           AND moderation_status = 'pending'`,
        [finalModerationStatus, reviewer_note || null, req.user.id, currentVideo.id]
      );
    }

    const [updatedVideos] = await pool.query(
      'SELECT * FROM videos WHERE id = ? LIMIT 1',
      [currentVideo.id]
    );

    return res.status(200).json({
      message: 'Admin video status updated successfully',
      video: normalizeVideoRow(updatedVideos[0]),
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
      `SELECT
        v.*,
        c.channel_name,
        c.channel_handle,
        c.channel_slug
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.slug = ?
       LIMIT 1`,
      [slug]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    return res.status(200).json({
      video: normalizeVideoRow(videos[0]),
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
      short_thumbnail_key,
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
      finalBuyNowEnabled == 1 && finalBuyNowUrl && !isSupgadUrl(finalBuyNowUrl);

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

    const finalDurationSeconds =
      duration_seconds !== undefined
        ? Number(duration_seconds || 0)
        : Number(currentVideo.duration_seconds || 0);

    const finalVideoFormat = resolveVideoFormat(finalDurationSeconds);

    const finalShortThumbnailKey =
      short_thumbnail_key !== undefined
        ? short_thumbnail_key
        : currentVideo.short_thumbnail_key;

    if (!finalShortThumbnailKey) {
      return res.status(400).json({
        message: 'Short thumbnail is required',
      });
    }

    const creatorCanChooseVideoMonetization = await isCreatorMonetized(
      creatorProfile.id
    );
    const finalIsMonetized = creatorCanChooseVideoMonetization
      ? is_monetized !== undefined
        ? Number(is_monetized)
        : Number(currentVideo.is_monetized || 0)
      : 0;

    await pool.query(
      `UPDATE videos
       SET channel_id = ?,
           category_id = ?,
           title = ?,
           slug = ?,
           description = ?,
           video_type = ?,
           source_type = ?,
           storage_provider = ?,
           video_key = ?,
           stream_key = ?,
           thumbnail_key = ?,
           short_thumbnail_key = ?,
           preview_key = ?,
           duration_seconds = ?,
           video_format = ?,
           visibility = ?,
           status = ?,
           moderation_status = ?,
           comments_enabled = ?,
           buy_now_enabled = ?,
           buy_now_url = ?,
           uses_external_link = ?,
           external_link_subscription_required = ?,
           is_monetized = ?,
           published_at = ?
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
        finalShortThumbnailKey,
        preview_key !== undefined ? preview_key : currentVideo.preview_key,
        finalDurationSeconds,
        finalVideoFormat,
        visibility || currentVideo.visibility,
        status || currentVideo.status,
        moderation_status || currentVideo.moderation_status,
        comments_enabled !== undefined ? comments_enabled : currentVideo.comments_enabled,
        finalBuyNowEnabled,
        finalBuyNowUrl,
        finalVideoUsesExternalLink ? 1 : 0,
        finalVideoUsesExternalLink ? 1 : 0,
        finalIsMonetized,
        published_at !== undefined ? published_at : currentVideo.published_at,
        currentVideo.id,
      ]
    );

    const finalStatusValue = status || currentVideo.status;
    const finalModerationStatusValue =
      moderation_status || currentVideo.moderation_status;

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
      video: normalizeVideoRow(updatedVideos[0]),
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