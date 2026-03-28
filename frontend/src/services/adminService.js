const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

function getToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('videogad_token') ||
    localStorage.getItem('authToken') ||
    ''
  );
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function setAdminUser(user) {
  localStorage.setItem('admin_user', JSON.stringify(user || {}));
}

function setAdminRoles(roles) {
  localStorage.setItem('admin_roles', JSON.stringify(Array.isArray(roles) ? roles : []));
}

function getAdminRoles() {
  try {
    return JSON.parse(localStorage.getItem('admin_roles') || '[]');
  } catch (error) {
    return [];
  }
}

function isAdminLoggedIn() {
  const token = getToken();
  const roles = getAdminRoles();
  return !!token && roles.includes('admin');
}

function logoutAdmin() {
  localStorage.removeItem('token');
  localStorage.removeItem('videogad_token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('admin_user');
  localStorage.removeItem('admin_roles');
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

function normalizeArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.videos)) return payload.videos;
  if (Array.isArray(payload?.reports)) return payload.reports;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.queue)) return payload.queue;
  if (Array.isArray(payload?.plans)) return payload.plans;
  if (Array.isArray(payload?.channels)) return payload.channels;
  if (Array.isArray(payload?.campaigns)) return payload.campaigns;
  if (Array.isArray(payload?.ad_campaigns)) return payload.ad_campaigns;
  if (Array.isArray(payload?.ad_videos)) return payload.ad_videos;
  if (Array.isArray(payload?.ads)) return payload.ads;
  return [];
}

function normalizeVideo(video, index = 0) {
  return {
    id: video?.id || video?.video_id || `video-${index}`,
    uuid: video?.uuid || '',
    title: video?.title || video?.name || video?.video_title || 'Untitled video',
    slug: video?.slug || '',
    description: video?.description || '',
    thumbnail_url:
      video?.thumbnail_url ||
      video?.thumbnail ||
      video?.thumbnail_key ||
      '',
    preview_key: video?.preview_key || '',
    video_key: video?.video_key || '',
    status: video?.status || video?.video_status || 'unknown',
    moderation_status:
      video?.moderation_status ||
      video?.review_status ||
      video?.approval_status ||
      video?.queue_status ||
      'pending',
    visibility: video?.visibility || 'public',
    creator_name:
      video?.creator_name ||
      video?.creator?.full_name ||
      video?.user?.full_name ||
      video?.full_name ||
      'Unknown creator',
    creator_email:
      video?.creator_email ||
      video?.creator?.email ||
      video?.user?.email ||
      '',
    channel_name:
      video?.channel_name ||
      video?.channel?.name ||
      video?.channel_title ||
      'No channel',
    channel_handle: video?.channel_handle || '',
    channel_slug: video?.channel_slug || '',
    created_at: video?.created_at || video?.createdAt || '',
    published_at: video?.published_at || '',
    views_count: Number(video?.views_count || video?.views || 0),
    raw: video,
  };
}

function normalizeQueueItem(item, index = 0) {
  const video = item?.video || item?.video_data || item || {};
  const normalizedVideo = normalizeVideo(video, index);

  return {
    id: item?.id || item?.queue_id || `queue-${index}`,
    queue_status: item?.status || item?.queue_status || 'pending',
    reason: item?.reason || item?.note || '',
    reviewer_note: item?.reviewer_note || '',
    created_at: item?.created_at || item?.createdAt || '',
    video_id: item?.video_id || normalizedVideo.id,
    video: normalizedVideo,
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
      report?.full_name ||
      'Unknown user',
    created_at: report?.created_at || report?.createdAt || '',
    raw: report,
  };
}

function normalizeChannel(channel, index = 0) {
  return {
    id: channel?.id || `channel-${index}`,
    creator_id: channel?.creator_id || '',
    user_id: channel?.user_id || '',
    channel_name: channel?.channel_name || 'Untitled channel',
    channel_handle: channel?.channel_handle || '',
    channel_slug: channel?.channel_slug || '',
    avatar_url: channel?.avatar_url || '',
    banner_url: channel?.banner_url || '',
    bio: channel?.bio || '',
    status: channel?.status || 'active',
    full_name: channel?.full_name || '',
    email: channel?.email || '',
    username: channel?.username || '',
    created_at: channel?.created_at || channel?.createdAt || '',
    raw: channel,
  };
}

const adminService = {
  async login(email, password) {
    const payload = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = payload?.token || '';
    const user = payload?.user || {};
    const roles = Array.isArray(payload?.roles) ? payload.roles : [];

    if (!token) {
      throw new Error('Login token not returned');
    }

    if (!roles.includes('admin')) {
      throw new Error('This account is not an admin account');
    }

    setToken(token);
    setAdminUser(user);
    setAdminRoles(roles);

    return payload;
  },

  async getMe() {
    return await safeRequest('/api/auth/me', { method: 'GET' }, null);
  },

  async verifyAdminSession() {
    const me = await this.getMe();

    if (!me) return false;

    const roles = Array.isArray(me?.roles) ? me.roles : [];
    if (!roles.includes('admin')) return false;

    setAdminUser(me?.user || {});
    setAdminRoles(roles);
    return true;
  },

  isAdminLoggedIn,
  logoutAdmin,

  async getVideos(params = {}) {
    return this.getAdminVideos(params);
  },

  async getAdminVideos(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.status) {
      searchParams.set('status', params.status);
    }

    if (params.moderation_status) {
      searchParams.set('moderation_status', params.moderation_status);
    }

    if (params.limit) {
      searchParams.set('limit', String(params.limit));
    }

    const query = searchParams.toString();
    const path = query ? `/api/videos/admin/all?${query}` : '/api/videos/admin/all';

    const payload = await safeRequest(path, { method: 'GET' }, []);
    return normalizeArrayPayload(payload).map((video, index) => normalizeVideo(video, index));
  },

  async getAdminVideoById(videoId) {
    const payload = await request(`/api/videos/admin/${videoId}`, {
      method: 'GET',
    });

    return normalizeVideo(payload?.video || payload, 0);
  },

  async updateAdminVideoStatus(videoId, payload) {
    return await request(`/api/videos/admin/${videoId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteAdminVideo(videoId) {
    return await request(`/api/videos/admin/${videoId}`, {
      method: 'DELETE',
    });
  },

  async getModerationQueue() {
    const payload = await safeRequest('/api/moderation-queue', { method: 'GET' }, []);
    return normalizeArrayPayload(payload).map((item, index) => normalizeQueueItem(item, index));
  },

  async reviewModeration(queueId, action, reviewer_note = '') {
    return await request(`/api/moderation-queue/${queueId}/review`, {
      method: 'PUT',
      body: JSON.stringify({
        action,
        reviewer_note,
      }),
    });
  },

  async getAdminChannels(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.status) {
      searchParams.set('status', params.status);
    }

    if (params.limit) {
      searchParams.set('limit', String(params.limit));
    }

    const query = searchParams.toString();
    const path = query ? `/api/channels/admin/all?${query}` : '/api/channels/admin/all';

    const payload = await safeRequest(path, { method: 'GET' }, []);
    return normalizeArrayPayload(payload).map((channel, index) => normalizeChannel(channel, index));
  },

  async getAdminChannelById(channelId) {
    const payload = await request(`/api/channels/admin/${channelId}`, {
      method: 'GET',
    });

    return normalizeChannel(payload?.channel || payload, 0);
  },

  async updateAdminChannel(channelId, payload) {
    return await request(`/api/channels/admin/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteAdminChannel(channelId) {
    return await request(`/api/channels/admin/${channelId}`, {
      method: 'DELETE',
    });
  },

  async getReports() {
    const payload = await safeRequest('/api/reports', { method: 'GET' }, []);
    return normalizeArrayPayload(payload).map((report, index) => normalizeReport(report, index));
  },

  async updateReportStatus(reportId, status) {
    return await request(`/api/reports/${reportId}/status`, {
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

  async createCategory(payload) {
    return await request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCategory(categoryId, payload) {
    return await request(`/api/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteCategory(categoryId) {
    return await request(`/api/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },

  async getExternalPostingPlans() {
    const payload = await safeRequest('/api/external-posting-plans', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async getAdCampaigns() {
    const payload = await safeRequest('/api/ads/campaigns', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async getPendingAdCampaigns() {
    const payload = await safeRequest('/api/ads/campaigns/pending', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async getAdVideos() {
    const payload = await safeRequest('/api/ads/videos', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async getPendingAdVideos() {
    const payload = await safeRequest('/api/ads/videos/pending', { method: 'GET' }, []);
    return normalizeArrayPayload(payload);
  },

  async approveAdCampaign(campaignId) {
    return await request(`/api/ads/campaigns/${campaignId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  },

  async approveAdVideo(videoId) {
    return await request(`/api/ads/videos/${videoId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  },

  async getCampaignStats(campaignId) {
    return await request(`/api/ads/campaigns/${campaignId}/stats`, {
      method: 'GET',
    });
  },

  async getAdPlayer(videoId = '') {
    const query = videoId ? `?videoId=${encodeURIComponent(videoId)}` : '';
    return await request(`/api/ads/player${query}`, {
      method: 'GET',
    });
  },

  async trackAdImpression(payload) {
    return await request('/api/ads/impressions', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  async trackAdClick(payload) {
    return await request('/api/ads/clicks', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  async trackAdSkip(payload) {
    return await request('/api/ads/skips', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },
};

export default adminService;