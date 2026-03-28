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

  async createAdCampaign(form) {
    const payload = {
      advertiser_name: form.advertiser_name,
      title: form.title,
      destination_url: form.destination_url,

      description: form.description,
      video_id: Number(form.video_id),

      duration_days: Number(form.duration_days || 0),
      budget: Number(form.budget || 0),
      daily_budget: Number(form.daily_budget || 0),

      payment_reference: form.payment_reference,
      payment_note: form.payment_note,

      start_date: form.start_date || null,
      end_date: form.end_date || null,

      objective: form.objective || 'views',
      status: 'pending',
    };

    return await api.request('/ads/campaigns', {
      method: 'POST',
      body: payload,
    });
  },

  async createAdVideo(form) {
    const payload = {
      title: form.ad_video_title,
      name: form.ad_video_title,
      ad_title: form.ad_video_title,

      description: form.ad_video_description,
      ad_description: form.ad_video_description,

      video_id: Number(form.video_id),
      campaign_id: form.campaign_id ? Number(form.campaign_id) : null,

      video_url: form.ad_video_url,
      ad_video_url: form.ad_video_url,
      media_url: form.ad_video_url,

      thumbnail_url: form.ad_thumbnail_url || '',
      duration_seconds: form.ad_duration_seconds ? Number(form.ad_duration_seconds) : null,

      status: 'pending',
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
    const query = videoId ? `?videoId=${encodeURIComponent(videoId)}` : '';
    return await api.request(`/ads/player${query}`);
  },
};

export default creatorAdsService;