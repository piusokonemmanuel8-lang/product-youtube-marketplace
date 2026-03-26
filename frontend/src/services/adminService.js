const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';

function getToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('videogad_token') ||
    localStorage.getItem('authToken') ||
    ''
  );
}

function buildHeaders(extra = {}) {
  const token = getToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: buildHeaders(options.headers || {}),
    });
  } catch (error) {
    throw new Error('Network error');
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.errors?.[0]?.message ||
      (typeof data === 'string' && data.trim()) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

async function safeRequest(path, options = {}, fallback = null) {
  try {
    return await request(path, options);
  } catch (error) {
    return fallback;
  }
}

async function tryPaths(paths, options = {}) {
  let lastError = null;

  for (const path of paths) {
    try {
      return await request(path, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('All endpoint attempts failed');
}

async function tryPathsSafe(paths, options = {}, fallback = null) {
  try {
    return await tryPaths(paths, options);
  } catch (error) {
    return fallback;
  }
}

function normalizeArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.videos)) return payload.videos;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.reports)) return payload.reports;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.plans)) return payload.plans;
  return [];
}

function normalizeVideo(video, index = 0) {
  return {
    id: video?.id || video?.video_id || video?._id || `video-${index}`,
    title: video?.title || video?.name || video?.video_title || 'Untitled video',
    slug: video?.slug || '',
    description: video?.description || '',
    thumbnail_url: video?.thumbnail_url || video?.thumbnail || '',
    status: video?.status || video?.video_status || 'unknown',
    moderation_status:
      video?.moderation_status || video?.review_status || video?.queue_status || 'pending',
    visibility: video?.visibility || 'public',
    creator_name:
      video?.creator_name ||
      video?.creator?.full_name ||
      video?.user?.full_name ||
      video?.channel_name ||
      'Unknown creator',
    channel_name: video?.channel_name || video?.channel?.name || 'No channel',
    created_at: video?.created_at || video?.createdAt || '',
    published_at: video?.published_at || '',
    views_count: video?.views_count || video?.views || 0,
    raw: video,
  };
}

function normalizeQueueItem(item, index = 0) {
  const video = item?.video || item?.video_data || item || {};
  const normalized = normalizeVideo(video, index);

  return {
    id: item?.id || item?.queue_id || `queue-${index}`,
    video_id: video?.id || video?.video_id || normalized.id,
    queue_status: item?.status || item?.queue_status || 'pending',
    reason: item?.reason || item?.note || '',
    created_at: item?.created_at || item?.createdAt || '',
    reviewer_note: item?.reviewer_note || '',
    video: normalized,
    raw: item,
  };
}

function normalizeReport(report, index = 0) {
  return {
    id: report?.id || report?.report_id || `report-${index}`,
    reason: report?.reason || report?.report_type || 'No reason',
    status: report?.status || 'pending',
    details: report?.details || report?.description || '',
    video_id: report?.video_id || report?.video?.id || '',
    video_title: report?.video_title || report?.video?.title || 'Unknown video',
    reported_by:
      report?.reported_by ||
      report?.user?.full_name ||
      report?.reporter?.full_name ||
      'Unknown user',
    created_at: report?.created_at || report?.createdAt || '',
    raw: report,
  };
}

const adminService = {
  async getMe() {
    return await safeRequest('/api/auth/me', { method: 'GET' }, null);
  },

  async getVideos() {
    const payload = await tryPathsSafe(
      [
        '/api/admin/videos',
        '/api/videos/admin',
        '/api/videos',
        '/api/moderation-queue',
      ],
      { method: 'GET' },
      []
    );

    const rows = normalizeArrayPayload(payload);

    return rows.map((item, index) => {
      if (item?.video || item?.video_id || item?.queue_status || item?.review_status) {
        return normalizeQueueItem(item, index).video;
      }
      return normalizeVideo(item, index);
    });
  },

  async getModerationQueue() {
    const payload = await safeRequest('/api/moderation-queue', { method: 'GET' }, []);
    return normalizeArrayPayload(payload).map((item, index) => normalizeQueueItem(item, index));
  },

  async reviewModeration(queueId, action, reviewer_note = '') {
    return request(`/api/moderation-queue/${queueId}/review`, {
      method: 'PUT',
      body: JSON.stringify({
        action,
        reviewer_note,
        status: action === 'approve' ? 'approved' : 'rejected',
      }),
    });
  },

  async approveVideo(videoOrQueueId) {
    try {
      return await tryPaths(
        [
          `/api/admin/videos/${videoOrQueueId}/status`,
          `/api/videos/${videoOrQueueId}/status`,
        ],
        {
          method: 'PUT',
          body: JSON.stringify({
            status: 'published',
            moderation_status: 'approved',
          }),
        }
      );
    } catch (error) {
      return this.reviewModeration(videoOrQueueId, 'approve');
    }
  },

  async rejectVideo(videoOrQueueId, reviewer_note = '') {
    try {
      return await tryPaths(
        [
          `/api/admin/videos/${videoOrQueueId}/status`,
          `/api/videos/${videoOrQueueId}/status`,
        ],
        {
          method: 'PUT',
          body: JSON.stringify({
            status: 'rejected',
            moderation_status: 'rejected',
            reviewer_note,
          }),
        }
      );
    } catch (error) {
      return this.reviewModeration(videoOrQueueId, 'reject', reviewer_note);
    }
  },

  async deleteVideo(videoId) {
    return tryPaths(
      [`/api/admin/videos/${videoId}`, `/api/videos/${videoId}`],
      { method: 'DELETE' }
    );
  },

  async getReports() {
    const payload = await safeRequest('/api/reports', { method: 'GET' }, []);
    return normalizeArrayPayload(payload).map((report, index) => normalizeReport(report, index));
  },

  async updateReportStatus(reportId, status) {
    return request(`/api/reports/${reportId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async getCategories() {
    const payload = await safeRequest('/api/categories', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async getCategoryTree() {
    const payload = await safeRequest('/api/categories/tree', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async getExternalPostingPlans() {
    const payload = await safeRequest('/api/external-posting-plans', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async getCreatorPayoutRequests() {
    const payload = await safeRequest('/api/creator/payout-requests', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async getPayoutTransactions() {
    const payload = await safeRequest('/api/creator/payout-transactions', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async getDashboardSummary() {
    return await safeRequest('/api/creator/dashboard-summary', { method: 'GET' }, {});
  },

  async getAnalyticsOverview() {
    return await safeRequest('/api/creator/analytics-overview', { method: 'GET' }, {});
  },
};

export default adminService;