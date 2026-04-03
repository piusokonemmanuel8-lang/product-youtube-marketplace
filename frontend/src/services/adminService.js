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
  if (Array.isArray(payload?.conversations)) return payload.conversations;
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.applications)) return payload.applications;
  if (Array.isArray(payload?.payout_requests)) return payload.payout_requests;
  if (Array.isArray(payload?.payouts)) return payload.payouts;
  if (Array.isArray(payload?.daily_breakdown)) return payload.daily_breakdown;
  if (Array.isArray(payload?.videos_breakdown)) return payload.videos_breakdown;
  return [];
}

function normalizeVideo(video, index = 0) {
  const creatorName =
    video?.creator_name ||
    video?.creator?.public_name ||
    video?.creator?.full_name ||
    video?.creator?.name ||
    video?.user?.full_name ||
    video?.user?.name ||
    video?.full_name ||
    video?.username ||
    video?.creator_username ||
    video?.user?.username ||
    video?.email ||
    video?.creator_email ||
    'Unknown creator';

  const creatorEmail =
    video?.creator_email ||
    video?.creator?.email ||
    video?.user?.email ||
    video?.email ||
    '';

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
    video_url:
      video?.video_url ||
      video?.file_url ||
      video?.playback_url ||
      video?.stream_url ||
      '',
    buy_now_url:
      video?.buy_now_url ||
      video?.product_url ||
      video?.destination_url ||
      '',
    status: video?.status || video?.video_status || 'unknown',
    moderation_status:
      video?.moderation_status ||
      video?.review_status ||
      video?.approval_status ||
      video?.queue_status ||
      'pending',
    visibility: video?.visibility || 'public',
    creator_name: creatorName,
    creator_email: creatorEmail,
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

function normalizeSupportConversation(conversation, index = 0) {
  return {
    id: conversation?.id || `conversation-${index}`,
    user_id: conversation?.user_id || '',
    assigned_admin_id: conversation?.assigned_admin_id || '',
    subject: conversation?.subject || `Conversation #${conversation?.id || index + 1}`,
    status: conversation?.status || 'open',
    last_message_at:
      conversation?.last_message_at ||
      conversation?.updated_at ||
      conversation?.created_at ||
      '',
    created_at: conversation?.created_at || '',
    updated_at: conversation?.updated_at || '',
    last_message_text: conversation?.last_message_text || '',
    unread_count: Number(conversation?.unread_count || 0),
    user_full_name:
      conversation?.user_full_name ||
      conversation?.user?.full_name ||
      conversation?.full_name ||
      '',
    user_username:
      conversation?.user_username ||
      conversation?.user?.username ||
      conversation?.username ||
      '',
    user_email:
      conversation?.user_email ||
      conversation?.user?.email ||
      conversation?.email ||
      '',
    admin_full_name:
      conversation?.admin_full_name ||
      conversation?.admin?.full_name ||
      '',
    admin_username:
      conversation?.admin_username ||
      conversation?.admin?.username ||
      '',
    admin_email:
      conversation?.admin_email ||
      conversation?.admin?.email ||
      '',
    raw: conversation,
  };
}

function normalizeSupportMessage(message, index = 0) {
  return {
    id: message?.id || `message-${index}`,
    conversation_id: message?.conversation_id || '',
    sender_user_id: message?.sender_user_id || '',
    sender_role: message?.sender_role || 'viewer',
    message_text: message?.message_text || '',
    is_read: Number(message?.is_read || 0),
    created_at: message?.created_at || '',
    full_name: message?.full_name || '',
    username: message?.username || '',
    email: message?.email || '',
    raw: message,
  };
}

function normalizeSupportConversationDetail(payload) {
  const conversation = payload?.conversation || payload?.data?.conversation || null;
  const messages = payload?.messages || payload?.data?.messages || [];

  return {
    conversation: conversation ? normalizeSupportConversation(conversation, 0) : null,
    messages: Array.isArray(messages)
      ? messages.map((message, index) => normalizeSupportMessage(message, index))
      : [],
    raw: payload,
  };
}

function normalizeMonetizationApplication(application, index = 0) {
  return {
    id: application?.id || `monetization-${index}`,
    creator_id: application?.creator_id || '',
    user_id: application?.user_id || '',
    status: application?.status || 'pending',
    subscriber_count: Number(application?.subscriber_count || 0),
    total_video_views: Number(application?.total_video_views || 0),
    total_watch_time_seconds: Number(application?.total_watch_time_seconds || 0),
    total_watch_hours: Number(application?.total_watch_hours || 0),
    has_active_external_subscription:
      application?.has_active_external_subscription === 1 ||
      application?.has_active_external_subscription === true,
    applied_message: application?.applied_message || '',
    admin_note: application?.admin_note || '',
    public_name: application?.public_name || '',
    full_name: application?.full_name || '',
    email: application?.email || '',
    approved_by: application?.approved_by || null,
    approved_at: application?.approved_at || '',
    rejected_by: application?.rejected_by || null,
    rejected_at: application?.rejected_at || '',
    created_at: application?.created_at || '',
    updated_at: application?.updated_at || '',
    raw: application,
  };
}

function normalizeRevenueSharePolicy(payload = {}) {
  const policy = payload?.revenue_share_policy || payload?.policy || payload || {};

  return {
    creator_share_percent: Number(policy?.creator_share_percent || 55),
    platform_share_percent: Number(policy?.platform_share_percent || 45),
    raw: policy,
  };
}

function normalizeRevenueSplitExample(payload = {}) {
  const source =
    payload?.revenue_split_example_for_100 ||
    payload?.revenue_allocation ||
    payload ||
    {};

  return {
    gross_revenue: Number(source?.gross_revenue || 100),
    creator_share_amount: Number(source?.creator_share_amount || 55),
    platform_share_amount: Number(source?.platform_share_amount || 45),
    creator_share_percent: Number(source?.creator_share_percent || 55),
    platform_share_percent: Number(source?.platform_share_percent || 45),
    raw: source,
  };
}

function normalizePayoutRequest(item, index = 0) {
  return {
    id: item?.id || `payout-${index}`,
    creator_id: item?.creator_id || '',
    payout_method_id: item?.payout_method_id || '',
    amount: Number(item?.amount || 0),
    currency_code: item?.currency_code || 'USD',
    status: item?.status || 'pending',
    requested_at: item?.requested_at || item?.created_at || '',
    created_at: item?.created_at || item?.requested_at || '',
    public_name: item?.public_name || '',
    full_name: item?.full_name || '',
    email: item?.email || '',
    available_balance: Number(item?.available_balance || 0),
    method_type: item?.method_type || '',
    account_name: item?.account_name || '',
    account_number: item?.account_number || '',
    bank_name: item?.bank_name || '',
    wallet_address: item?.wallet_address || '',
    raw: item,
  };
}

function normalizeAdminAnalytics(payload = {}) {
  const summary = payload?.summary || {};
  const today = payload?.today || {};
  const yesterday = payload?.yesterday || {};

  return {
    date_range: {
      start_date: payload?.date_range?.start_date || '',
      end_date: payload?.date_range?.end_date || '',
    },
    summary: {
      total_visitors: Number(summary?.total_visitors || 0),
      total_video_views: Number(summary?.total_video_views || 0),
      total_buy_now_clicks: Number(summary?.total_buy_now_clicks || 0),
      total_videos_with_clicks: Number(summary?.total_videos_with_clicks || 0),
    },
    today: {
      date: today?.date || '',
      total_visitors: Number(today?.total_visitors || 0),
      total_video_views: Number(today?.total_video_views || 0),
      total_buy_now_clicks: Number(today?.total_buy_now_clicks || 0),
    },
    yesterday: {
      date: yesterday?.date || '',
      total_visitors: Number(yesterday?.total_visitors || 0),
      total_video_views: Number(yesterday?.total_video_views || 0),
      total_buy_now_clicks: Number(yesterday?.total_buy_now_clicks || 0),
    },
    daily_breakdown: Array.isArray(payload?.daily_breakdown)
      ? payload.daily_breakdown.map((item) => ({
          analytics_date: item?.analytics_date || '',
          visitors: Number(item?.visitors || 0),
          video_views: Number(item?.video_views || 0),
          buy_now_clicks: Number(item?.buy_now_clicks || 0),
        }))
      : [],
    videos_breakdown: Array.isArray(payload?.videos_breakdown)
      ? payload.videos_breakdown.map((item, index) => ({
          id: item?.id || `analytics-video-${index}`,
          title: item?.title || 'Untitled video',
          slug: item?.slug || '',
          thumbnail_key: item?.thumbnail_key || '',
          thumbnail_url: item?.thumbnail_url || item?.thumbnail_key || '',
          video_views: Number(item?.video_views || 0),
          buy_now_clicks: Number(item?.buy_now_clicks || 0),
          raw: item,
        }))
      : [],
    raw: payload,
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

    if (params.status) searchParams.set('status', params.status);
    if (params.moderation_status) searchParams.set('moderation_status', params.moderation_status);
    if (params.limit) searchParams.set('limit', String(params.limit));

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

    if (params.status) searchParams.set('status', params.status);
    if (params.limit) searchParams.set('limit', String(params.limit));

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

  async pauseAdCampaign(campaignId) {
    return await request(`/api/ads/campaigns/${campaignId}/pause`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  },

  async deleteAdCampaign(campaignId) {
    return await request(`/api/ads/campaigns/${campaignId}`, {
      method: 'DELETE',
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

  async getSupportConversations(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    const path = query
      ? `/api/support/admin/conversations?${query}`
      : '/api/support/admin/conversations';

    const payload = await safeRequest(path, { method: 'GET' }, []);
    return normalizeArrayPayload(payload).map((conversation, index) =>
      normalizeSupportConversation(conversation, index)
    );
  },

  async getSupportConversationById(conversationId) {
    const payload = await request(`/api/support/admin/conversations/${conversationId}`, {
      method: 'GET',
    });

    return normalizeSupportConversationDetail(payload);
  },

  async sendSupportReply(conversationId, payload) {
    const response = await request(`/api/support/admin/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });

    return normalizeSupportConversationDetail(response);
  },

  async updateSupportConversationStatus(conversationId, status) {
    return await request(`/api/support/admin/conversations/${conversationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async getMonetizationApplications(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const path = query
      ? `/api/admin/monetization/applications?${query}`
      : '/api/admin/monetization/applications';

    const payload = await safeRequest(path, { method: 'GET' }, []);
    return normalizeArrayPayload(payload).map((application, index) =>
      normalizeMonetizationApplication(application, index)
    );
  },

  async getMonetizationApplicationById(applicationId) {
    const payload = await request(`/api/admin/monetization/applications/${applicationId}`, {
      method: 'GET',
    });

    return normalizeMonetizationApplication(
      payload?.application || payload?.data?.application || payload,
      0
    );
  },

  async updateMonetizationApplicationStatus(applicationId, payload) {
    return await request(`/api/admin/monetization/applications/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload || {}),
    });
  },

  async getRevenueSharePolicy() {
    const payload = await request('/api/admin/monetization/applications', {
      method: 'GET',
    });

    return normalizeRevenueSharePolicy(payload);
  },

  async getRevenueSplitExampleFor100() {
    const payload = await request('/api/admin/monetization/applications', {
      method: 'GET',
    });

    return normalizeRevenueSplitExample(payload);
  },

  async getAdminPayoutRequests(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const path = query
      ? `/api/admin/payout-requests?${query}`
      : '/api/admin/payout-requests';

    const payload = await safeRequest(path, { method: 'GET' }, []);
    return normalizeArrayPayload(payload).map((item, index) =>
      normalizePayoutRequest(item, index)
    );
  },

  async updateAdminPayoutRequestStatus(requestId, payload) {
    return await request(`/api/admin/payout-requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload || {}),
    });
  },

  async markAdminPayoutRequestPaid(requestId, payload = {}) {
    return await request(`/api/admin/payout-requests/${requestId}/pay`, {
      method: 'PUT',
      body: JSON.stringify(payload || {}),
    });
  },

  async getAdminPlatformAnalytics(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.date) searchParams.set('date', params.date);
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);

    const query = searchParams.toString();
    const path = query
      ? `/api/analytics/admin/platform?${query}`
      : '/api/analytics/admin/platform';

    const payload = await request(path, {
      method: 'GET',
    });

    return normalizeAdminAnalytics(payload);
  },
};

export default adminService;