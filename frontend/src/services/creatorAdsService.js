import api from './api';

function normalizeArray(value, fallbackKeys = []) {
  if (Array.isArray(value)) return value;

  for (const key of fallbackKeys) {
    if (Array.isArray(value?.[key])) return value[key];
  }

  if (Array.isArray(value?.data)) return value.data;

  return [];
}

const creatorAdsService = {
  async getMyVideos() {
    const payload = await api.request('/videos/me');
    return normalizeArray(payload, ['videos', 'items', 'data']);
  },

  async getMyAdCampaigns() {
    return await api.request('/ads/my-campaigns');
  },

  async getMyAdVideos() {
    return await api.request('/ads/my-videos');
  },

  async createAdCampaign(form) {
    const skipAfterSeconds = Math.max(Number(form.skip_after_seconds || 10), 3);

    const payload = {
      advertiser_name: form.advertiser_name,
      advertiser_email: form.advertiser_email || null,
      title: form.title,
      destination_url: form.destination_url,
      budget: Number(form.budget || 0),
      cost_per_view: Number(form.cost_per_view || 0),
      cost_per_click: Number(form.cost_per_click || 0),
      max_impressions: Number(form.max_impressions || 0),
      max_clicks: Number(form.max_clicks || 0),
      skip_after_seconds: skipAfterSeconds,
      starts_at: form.start_date || null,
      ends_at: form.end_date || null,
    };

    return await api.request('/ads/campaigns', {
      method: 'POST',
      body: payload,
    });
  },

  async createAdVideo(form) {
    const payload = {
      campaign_id: Number(form.campaign_id),
      video_id: Number(form.video_id),
      title: form.ad_video_title,
      duration_seconds: form.ad_duration_seconds ? Number(form.ad_duration_seconds) : 0,
    };

    return await api.request('/ads/videos', {
      method: 'POST',
      body: payload,
    });
  },

  async getCampaignStats(campaignId) {
    return await api.request(`/ads/campaigns/${campaignId}/stats`);
  },

  async trackImpression(payload) {
    return await api.request('/ads/impressions', {
      method: 'POST',
      body: payload,
    });
  },

  async trackClick(payload) {
    return await api.request('/ads/clicks', {
      method: 'POST',
      body: payload,
    });
  },

  async trackSkip(payload) {
    return await api.request('/ads/skips', {
      method: 'POST',
      body: payload,
    });
  },

  async getAdPlayer(videoId) {
    const query = videoId ? `?video_id=${encodeURIComponent(videoId)}` : '';
    return await api.request(`/ads/player${query}`);
  },
};

export default creatorAdsService;