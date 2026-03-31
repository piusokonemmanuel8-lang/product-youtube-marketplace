import React, { useEffect, useMemo, useState } from 'react';
import './AdminDashboardApp.css';
import adminService from '../services/adminService';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'videos', label: 'All Videos' },
  { key: 'moderation', label: 'Pending Videos' },
  { key: 'channels', label: 'Channels' },
  { key: 'reports', label: 'Reports' },
  { key: 'categories', label: 'Categories' },
  { key: 'plans', label: 'External Plans' },
  { key: 'ads', label: 'Ads Control' },
  { key: 'support', label: 'Support Chat' },
  { key: 'monetization', label: 'Monetization' },
  { key: 'payouts', label: 'Payouts' },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatHours(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getCategoryName(category) {
  return (
    category?.name ||
    category?.title ||
    category?.category_name ||
    category?.slug ||
    'Unnamed category'
  );
}

function getStatusClass(value) {
  return String(value || 'unknown').toLowerCase().replace(/\s+/g, '-');
}

function normalizeAdCampaign(campaign, index = 0) {
  return {
    id: campaign?.id || `campaign-${index}`,
    uuid: campaign?.uuid || '',
    advertiser_name: campaign?.advertiser_name || 'Unknown advertiser',
    advertiser_email: campaign?.advertiser_email || '',
    title: campaign?.title || 'Untitled campaign',
    destination_url: campaign?.destination_url || '',
    budget: Number(campaign?.budget || 0),
    cost_per_view: Number(campaign?.cost_per_view || 0),
    cost_per_click: Number(campaign?.cost_per_click || 0),
    max_impressions: Number(campaign?.max_impressions || 0),
    max_clicks: Number(campaign?.max_clicks || 0),
    skip_after_seconds: Number(campaign?.skip_after_seconds || 0),
    status: campaign?.status || 'draft',
    pause_reason: campaign?.pause_reason || '',
    pause_notice: campaign?.pause_notice || '',
    paused_at: campaign?.paused_at || '',
    starts_at: campaign?.starts_at || '',
    ends_at: campaign?.ends_at || '',
    created_at: campaign?.created_at || '',
    raw: campaign,
  };
}

function normalizeAdVideo(adVideo, index = 0) {
  return {
    id: adVideo?.id || `ad-video-${index}`,
    campaign_id: adVideo?.campaign_id || '',
    title: adVideo?.title || 'Untitled ad video',
    video_key: adVideo?.video_key || '',
    thumbnail_key: adVideo?.thumbnail_key || '',
    duration_seconds: Number(adVideo?.duration_seconds || 0),
    status: adVideo?.status || 'pending',
    campaign_title: adVideo?.campaign_title || '',
    advertiser_name: adVideo?.advertiser_name || '',
    campaign_status: adVideo?.campaign_status || '',
    created_at: adVideo?.created_at || '',
    raw: adVideo,
  };
}

function getCampaignRuntimeStatus(campaign) {
  const baseStatus = String(campaign?.status || '').toLowerCase();
  const now = Date.now();

  if (baseStatus === 'paused') return 'paused';
  if (baseStatus === 'draft' || baseStatus === 'pending') return 'pending';
  if (baseStatus === 'rejected' || baseStatus === 'declined') return 'rejected';

  const startsAt = campaign?.starts_at ? new Date(campaign.starts_at).getTime() : null;
  const endsAt = campaign?.ends_at ? new Date(campaign.ends_at).getTime() : null;

  if (endsAt && !Number.isNaN(endsAt) && endsAt < now) return 'ended';
  if (startsAt && !Number.isNaN(startsAt) && startsAt > now) return 'scheduled';
  if (baseStatus === 'active') return 'running';

  return baseStatus || 'unknown';
}

function campaignMatchesFilter(campaign, filterValue) {
  if (!filterValue || filterValue === 'all') return true;

  const dbStatus = String(campaign?.status || '').toLowerCase();
  const runtimeStatus = getCampaignRuntimeStatus(campaign);
  const pauseReason = String(campaign?.pause_reason || '').toLowerCase();

  if (filterValue === 'approved') return dbStatus === 'active';
  if (filterValue === 'still-running') return runtimeStatus === 'running';
  if (filterValue === 'wallet_exhausted') return pauseReason === 'wallet_exhausted';

  return runtimeStatus === filterValue || dbStatus === filterValue;
}

function normalizeConversationList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getSplitFromPolicy(policy) {
  return {
    creator_share_percent: Number(policy?.creator_share_percent || 55),
    platform_share_percent: Number(policy?.platform_share_percent || 45),
  };
}

function getReservedFromCampaign(campaign, policy) {
  const split = getSplitFromPolicy(policy);
  const totalRevenue =
    Number(campaign?.budget || 0) > 0
      ? Number(campaign.budget || 0)
      : Number(campaign?.cost_per_view || 0) + Number(campaign?.cost_per_click || 0);

  const creatorReserved = (totalRevenue * split.creator_share_percent) / 100;
  const platformKept = (totalRevenue * split.platform_share_percent) / 100;

  return {
    gross: totalRevenue,
    creator_reserved: creatorReserved,
    platform_kept: platformKept,
  };
}

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [adsStatusFilter, setAdsStatusFilter] = useState('all');

  const [me, setMe] = useState(null);
  const [videos, setVideos] = useState([]);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [channels, setChannels] = useState([]);
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [plans, setPlans] = useState([]);
  const [adCampaigns, setAdCampaigns] = useState([]);
  const [pendingAdCampaigns, setPendingAdCampaigns] = useState([]);
  const [adVideos, setAdVideos] = useState([]);
  const [pendingAdVideos, setPendingAdVideos] = useState([]);

  const [supportConversations, setSupportConversations] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportConversationLoading, setSupportConversationLoading] = useState(false);
  const [selectedSupportConversationId, setSelectedSupportConversationId] = useState(null);
  const [selectedSupportConversation, setSelectedSupportConversation] = useState(null);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportReplyMessage, setSupportReplyMessage] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState('all');
  const [supportStatusUpdating, setSupportStatusUpdating] = useState(false);
  const [supportSending, setSupportSending] = useState(false);

  const [monetizationApplications, setMonetizationApplications] = useState([]);
  const [monetizationLoading, setMonetizationLoading] = useState(false);
  const [monetizationStatusFilter, setMonetizationStatusFilter] = useState('all');
  const [selectedMonetizationApplicationId, setSelectedMonetizationApplicationId] = useState(null);
  const [selectedMonetizationApplication, setSelectedMonetizationApplication] = useState(null);
  const [monetizationActionLoading, setMonetizationActionLoading] = useState(false);

  const [payoutRequests, setPayoutRequests] = useState([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [selectedPayoutRequestId, setSelectedPayoutRequestId] = useState(null);
  const [selectedPayoutRequest, setSelectedPayoutRequest] = useState(null);
  const [payoutActionLoading, setPayoutActionLoading] = useState(false);

  const [revenueSharePolicy, setRevenueSharePolicy] = useState({
    creator_share_percent: 55,
    platform_share_percent: 45,
  });

  const [revenueSplitExample, setRevenueSplitExample] = useState({
    gross_revenue: 100,
    creator_share_amount: 55,
    platform_share_amount: 45,
    creator_share_percent: 55,
    platform_share_percent: 45,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    parent_id: '',
    description: '',
  });

  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [editingChannelId, setEditingChannelId] = useState(null);
  const [channelForm, setChannelForm] = useState({
    channel_name: '',
    channel_handle: '',
    channel_slug: '',
    avatar_url: '',
    banner_url: '',
    bio: '',
    status: 'active',
  });

  const [adTools, setAdTools] = useState({
    campaignId: '',
    adVideoId: '',
    statsCampaignId: '',
  });

  const [campaignStats, setCampaignStats] = useState(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setLoading(true);

    if (!adminService.isAdminLoggedIn()) {
      setAuthorized(false);
      setSessionChecked(true);
      setLoading(false);
      return;
    }

    const valid = await adminService.verifyAdminSession();

    if (!valid) {
      adminService.logoutAdmin();
      setAuthorized(false);
      setSessionChecked(true);
      setLoading(false);
      return;
    }

    setAuthorized(true);
    setSessionChecked(true);
    await loadAll();
  }

  async function loadAll() {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const [
        meData,
        videosData,
        queueData,
        channelsData,
        reportsData,
        categoriesData,
        treeData,
        plansData,
        adCampaignsData,
        pendingAdCampaignsData,
        adVideosData,
        pendingAdVideosData,
        revenuePolicyData,
        revenueExampleData,
        payoutRequestsData,
      ] = await Promise.all([
        adminService.getMe(),
        adminService.getVideos ? adminService.getVideos() : Promise.resolve([]),
        adminService.getModerationQueue ? adminService.getModerationQueue() : Promise.resolve([]),
        adminService.getAdminChannels ? adminService.getAdminChannels() : Promise.resolve([]),
        adminService.getReports ? adminService.getReports() : Promise.resolve([]),
        adminService.getCategories ? adminService.getCategories() : Promise.resolve([]),
        adminService.getCategoryTree ? adminService.getCategoryTree() : Promise.resolve([]),
        adminService.getExternalPostingPlans ? adminService.getExternalPostingPlans() : Promise.resolve([]),
        adminService.getAdCampaigns ? adminService.getAdCampaigns() : Promise.resolve([]),
        adminService.getPendingAdCampaigns ? adminService.getPendingAdCampaigns() : Promise.resolve([]),
        adminService.getAdVideos ? adminService.getAdVideos() : Promise.resolve([]),
        adminService.getPendingAdVideos ? adminService.getPendingAdVideos() : Promise.resolve([]),
        adminService.getRevenueSharePolicy ? adminService.getRevenueSharePolicy() : Promise.resolve(null),
        adminService.getRevenueSplitExampleFor100 ? adminService.getRevenueSplitExampleFor100() : Promise.resolve(null),
        adminService.getAdminPayoutRequests ? adminService.getAdminPayoutRequests() : Promise.resolve([]),
      ]);

      setMe(meData);
      setVideos(Array.isArray(videosData) ? videosData : []);
      setModerationQueue(Array.isArray(queueData) ? queueData : []);
      setChannels(Array.isArray(channelsData) ? channelsData : []);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setCategoryTree(Array.isArray(treeData) ? treeData : []);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setAdCampaigns(
        Array.isArray(adCampaignsData)
          ? adCampaignsData.map((item, index) => normalizeAdCampaign(item, index))
          : []
      );
      setPendingAdCampaigns(
        Array.isArray(pendingAdCampaignsData)
          ? pendingAdCampaignsData.map((item, index) => normalizeAdCampaign(item, index))
          : []
      );
      setAdVideos(
        Array.isArray(adVideosData)
          ? adVideosData.map((item, index) => normalizeAdVideo(item, index))
          : []
      );
      setPendingAdVideos(
        Array.isArray(pendingAdVideosData)
          ? pendingAdVideosData.map((item, index) => normalizeAdVideo(item, index))
          : []
      );
      setPayoutRequests(Array.isArray(payoutRequestsData) ? payoutRequestsData : []);

      if (revenuePolicyData) {
        setRevenueSharePolicy({
          creator_share_percent: Number(revenuePolicyData.creator_share_percent || 55),
          platform_share_percent: Number(revenuePolicyData.platform_share_percent || 45),
        });
      }

      if (revenueExampleData) {
        setRevenueSplitExample({
          gross_revenue: Number(revenueExampleData.gross_revenue || 100),
          creator_share_amount: Number(revenueExampleData.creator_share_amount || 55),
          platform_share_amount: Number(revenueExampleData.platform_share_amount || 45),
          creator_share_percent: Number(revenueExampleData.creator_share_percent || 55),
          platform_share_percent: Number(revenueExampleData.platform_share_percent || 45),
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'support') {
      loadSupportConversations();
    }

    if (activeTab === 'monetization') {
      loadMonetizationApplications();
    }

    if (activeTab === 'payouts') {
      loadPayoutRequests();
    }
  }, [activeTab]);

  async function loadSupportConversations(preferredConversationId = null) {
    setSupportLoading(true);

    try {
      const params = {};

      if (supportStatusFilter && supportStatusFilter !== 'all') {
        params.status = supportStatusFilter;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await adminService.getSupportConversations(params);
      const items = normalizeConversationList(response);

      setSupportConversations(Array.isArray(items) ? items : []);

      const nextId =
        preferredConversationId ||
        selectedSupportConversationId ||
        items?.[0]?.id ||
        null;

      if (nextId) {
        await loadSupportConversation(nextId);
      } else {
        setSelectedSupportConversationId(null);
        setSelectedSupportConversation(null);
        setSupportMessages([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load support conversations');
    } finally {
      setSupportLoading(false);
    }
  }

  async function loadSupportConversation(conversationId) {
    if (!conversationId) return;

    setSupportConversationLoading(true);

    try {
      const detail = await adminService.getSupportConversationById(conversationId);
      setSelectedSupportConversationId(Number(conversationId));
      setSelectedSupportConversation(detail?.conversation || null);
      setSupportMessages(Array.isArray(detail?.messages) ? detail.messages : []);

      setSupportConversations((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(conversationId)
            ? { ...item, unread_count: 0 }
            : item
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to open support conversation');
    } finally {
      setSupportConversationLoading(false);
    }
  }

  async function handleSendSupportReply(event) {
    event.preventDefault();

    if (!selectedSupportConversationId) {
      setError('Select a support conversation first');
      return;
    }

    const messageText = String(supportReplyMessage || '').trim();

    if (!messageText) {
      setError('Reply message is required');
      return;
    }

    setSupportSending(true);
    setError('');
    setSuccessMessage('');

    try {
      const detail = await adminService.sendSupportReply(selectedSupportConversationId, {
        message_text: messageText,
      });

      setSupportReplyMessage('');
      setSelectedSupportConversation(detail?.conversation || null);
      setSupportMessages(Array.isArray(detail?.messages) ? detail.messages : []);
      setSuccessMessage('Support reply sent');

      await loadSupportConversations(selectedSupportConversationId);
    } catch (err) {
      setError(err.message || 'Failed to send support reply');
    } finally {
      setSupportSending(false);
    }
  }

  async function handleSupportStatusChange(status) {
    if (!selectedSupportConversationId) {
      setError('Select a support conversation first');
      return;
    }

    setSupportStatusUpdating(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await adminService.updateSupportConversationStatus(
        selectedSupportConversationId,
        status
      );

      const updatedConversation =
        response?.conversation ||
        response?.data?.conversation ||
        selectedSupportConversation;

      setSelectedSupportConversation((prev) => ({
        ...(prev || {}),
        ...(updatedConversation || {}),
        status,
      }));

      setSupportConversations((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(selectedSupportConversationId)
            ? { ...item, status }
            : item
        )
      );

      setSuccessMessage(`Conversation marked as ${status}`);
    } catch (err) {
      setError(err.message || 'Failed to update support status');
    } finally {
      setSupportStatusUpdating(false);
    }
  }

  async function loadMonetizationApplications(preferredApplicationId = null) {
    setMonetizationLoading(true);

    try {
      const params = {};
      if (monetizationStatusFilter && monetizationStatusFilter !== 'all') {
        params.status = monetizationStatusFilter;
      }

      const items = await adminService.getMonetizationApplications(params);
      setMonetizationApplications(Array.isArray(items) ? items : []);

      const nextId =
        preferredApplicationId ||
        selectedMonetizationApplicationId ||
        items?.[0]?.id ||
        null;

      if (nextId) {
        await loadMonetizationApplication(nextId);
      } else {
        setSelectedMonetizationApplicationId(null);
        setSelectedMonetizationApplication(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load monetization applications');
    } finally {
      setMonetizationLoading(false);
    }
  }

  async function loadMonetizationApplication(applicationId) {
    if (!applicationId) return;

    try {
      const application = await adminService.getMonetizationApplicationById(applicationId);
      setSelectedMonetizationApplicationId(Number(applicationId));
      setSelectedMonetizationApplication(application || null);
    } catch (err) {
      setError(err.message || 'Failed to load monetization application');
    }
  }

  async function handleMonetizationDecision(status) {
    if (!selectedMonetizationApplicationId) {
      setError('Select a monetization application first');
      return;
    }

    const adminNote =
      window.prompt(
        status === 'approved'
          ? 'Optional approval note:'
          : 'Reason for rejection (optional):',
        ''
      ) || '';

    setMonetizationActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.updateMonetizationApplicationStatus(
        selectedMonetizationApplicationId,
        {
          status,
          admin_note: adminNote,
        }
      );

      setSuccessMessage(
        `Monetization application ${status === 'approved' ? 'approved' : 'rejected'}`
      );

      await loadMonetizationApplications(selectedMonetizationApplicationId);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Failed to update monetization application');
    } finally {
      setMonetizationActionLoading(false);
    }
  }

  async function loadPayoutRequests(preferredRequestId = null) {
    setPayoutLoading(true);

    try {
      const params = {};
      if (payoutStatusFilter && payoutStatusFilter !== 'all') {
        params.status = payoutStatusFilter;
      }

      const items = await adminService.getAdminPayoutRequests(params);
      setPayoutRequests(Array.isArray(items) ? items : []);

      const nextId =
        preferredRequestId ||
        selectedPayoutRequestId ||
        items?.[0]?.id ||
        null;

      if (nextId) {
        const selected =
          items.find((item) => Number(item.id) === Number(nextId)) || null;
        setSelectedPayoutRequestId(Number(nextId));
        setSelectedPayoutRequest(selected);
      } else {
        setSelectedPayoutRequestId(null);
        setSelectedPayoutRequest(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load payout requests');
    } finally {
      setPayoutLoading(false);
    }
  }

  async function handlePayoutStatus(status) {
    if (!selectedPayoutRequestId) {
      setError('Select a payout request first');
      return;
    }

    setPayoutActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.updateAdminPayoutRequestStatus(selectedPayoutRequestId, { status });
      setSuccessMessage(`Payout request ${status}`);
      await loadPayoutRequests(selectedPayoutRequestId);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Failed to update payout request');
    } finally {
      setPayoutActionLoading(false);
    }
  }

  async function handleMarkPayoutPaid() {
    if (!selectedPayoutRequestId) {
      setError('Select a payout request first');
      return;
    }

    const note = window.prompt('Payment note (optional):', '') || '';

    setPayoutActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.markAdminPayoutRequestPaid(selectedPayoutRequestId, { note });
      setSuccessMessage('Payout request marked as paid');
      await loadPayoutRequests(selectedPayoutRequestId);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Failed to mark payout as paid');
    } finally {
      setPayoutActionLoading(false);
    }
  }

  function handleLogout() {
    adminService.logoutAdmin();
    window.location.href = '/admin-login';
  }

  const filteredVideos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return videos;

    return videos.filter((video) => {
      return (
        String(video?.title || '').toLowerCase().includes(term) ||
        String(video?.creator_name || '').toLowerCase().includes(term) ||
        String(video?.creator_email || '').toLowerCase().includes(term) ||
        String(video?.channel_name || '').toLowerCase().includes(term) ||
        String(video?.status || '').toLowerCase().includes(term) ||
        String(video?.moderation_status || '').toLowerCase().includes(term)
      );
    });
  }, [videos, searchTerm]);

  const pendingVideosFromAllVideos = useMemo(() => {
    return videos.filter((video) => {
      const moderation = String(video?.moderation_status || '').toLowerCase();
      const status = String(video?.status || '').toLowerCase();
      return moderation === 'pending' || status === 'draft';
    });
  }, [videos]);

  const mergedPendingItems = useMemo(() => {
    const queueMap = new Map();

    moderationQueue.forEach((item, index) => {
      const key = item?.video_id || item?.video?.id || `queue-${index}`;
      queueMap.set(String(key), {
        type: 'queue',
        id: item.id,
        video_id: item.video_id || item?.video?.id,
        queue_status: item.queue_status || 'pending',
        reason: item.reason || 'video_upload',
        created_at: item.created_at || item?.video?.created_at || '',
        video: item.video || null,
        raw: item,
      });
    });

    pendingVideosFromAllVideos.forEach((video, index) => {
      const key = String(video.id || `video-${index}`);
      if (!queueMap.has(key)) {
        queueMap.set(key, {
          type: 'video',
          id: `video-pending-${video.id}`,
          video_id: video.id,
          queue_status: video.moderation_status || 'pending',
          reason: 'Pending from videos table',
          created_at: video.created_at || '',
          video,
          raw: video,
        });
      }
    });

    return Array.from(queueMap.values()).sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [moderationQueue, pendingVideosFromAllVideos]);

  const filteredQueue = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return mergedPendingItems;

    return mergedPendingItems.filter((item) => {
      return (
        String(item?.video?.title || '').toLowerCase().includes(term) ||
        String(item?.video?.creator_name || '').toLowerCase().includes(term) ||
        String(item?.queue_status || '').toLowerCase().includes(term) ||
        String(item?.reason || '').toLowerCase().includes(term)
      );
    });
  }, [mergedPendingItems, searchTerm]);

  const filteredChannels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return channels;

    return channels.filter((channel) => {
      return (
        String(channel?.channel_name || '').toLowerCase().includes(term) ||
        String(channel?.channel_handle || '').toLowerCase().includes(term) ||
        String(channel?.channel_slug || '').toLowerCase().includes(term) ||
        String(channel?.full_name || '').toLowerCase().includes(term) ||
        String(channel?.email || '').toLowerCase().includes(term) ||
        String(channel?.status || '').toLowerCase().includes(term)
      );
    });
  }, [channels, searchTerm]);

  const filteredReports = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return reports;

    return reports.filter((report) => {
      return (
        String(report?.video_title || '').toLowerCase().includes(term) ||
        String(report?.reported_by || '').toLowerCase().includes(term) ||
        String(report?.reason || '').toLowerCase().includes(term) ||
        String(report?.status || '').toLowerCase().includes(term)
      );
    });
  }, [reports, searchTerm]);

  const filteredAdCampaigns = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const source = adCampaigns;

    return source.filter((campaign) => {
      const matchesSearch =
        !term ||
        String(campaign?.title || '').toLowerCase().includes(term) ||
        String(campaign?.advertiser_name || '').toLowerCase().includes(term) ||
        String(campaign?.advertiser_email || '').toLowerCase().includes(term) ||
        String(campaign?.status || '').toLowerCase().includes(term) ||
        String(campaign?.destination_url || '').toLowerCase().includes(term) ||
        String(campaign?.pause_notice || '').toLowerCase().includes(term) ||
        String(campaign?.pause_reason || '').toLowerCase().includes(term) ||
        String(getCampaignRuntimeStatus(campaign)).toLowerCase().includes(term);

      const matchesStatus = campaignMatchesFilter(campaign, adsStatusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [adCampaigns, searchTerm, adsStatusFilter]);

  const filteredAdVideos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const source = adVideos;

    return source.filter((adVideo) => {
      const matchesSearch =
        !term ||
        String(adVideo?.title || '').toLowerCase().includes(term) ||
        String(adVideo?.campaign_title || '').toLowerCase().includes(term) ||
        String(adVideo?.advertiser_name || '').toLowerCase().includes(term) ||
        String(adVideo?.status || '').toLowerCase().includes(term);

      if (adsStatusFilter === 'all') return matchesSearch;
      if (adsStatusFilter === 'pending') {
        return matchesSearch && String(adVideo?.status || '').toLowerCase() === 'pending';
      }
      if (adsStatusFilter === 'approved') {
        return matchesSearch && String(adVideo?.status || '').toLowerCase() === 'approved';
      }
      return matchesSearch;
    });
  }, [adVideos, searchTerm, adsStatusFilter]);

  const filteredSupportConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return supportConversations.filter((conversation) => {
      const matchesSearch =
        !term ||
        String(conversation?.subject || '').toLowerCase().includes(term) ||
        String(conversation?.user_full_name || '').toLowerCase().includes(term) ||
        String(conversation?.user_email || '').toLowerCase().includes(term) ||
        String(conversation?.user_username || '').toLowerCase().includes(term) ||
        String(conversation?.status || '').toLowerCase().includes(term) ||
        String(conversation?.last_message_text || '').toLowerCase().includes(term);

      const matchesStatus =
        supportStatusFilter === 'all' ||
        String(conversation?.status || '').toLowerCase() === supportStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [supportConversations, searchTerm, supportStatusFilter]);

  const filteredMonetizationApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return monetizationApplications.filter((application) => {
      const matchesSearch =
        !term ||
        String(application?.public_name || '').toLowerCase().includes(term) ||
        String(application?.full_name || '').toLowerCase().includes(term) ||
        String(application?.email || '').toLowerCase().includes(term) ||
        String(application?.status || '').toLowerCase().includes(term);

      const matchesStatus =
        monetizationStatusFilter === 'all' ||
        String(application?.status || '').toLowerCase() === monetizationStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [monetizationApplications, searchTerm, monetizationStatusFilter]);

  const filteredPayoutRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return payoutRequests.filter((item) => {
      const matchesSearch =
        !term ||
        String(item?.public_name || '').toLowerCase().includes(term) ||
        String(item?.full_name || '').toLowerCase().includes(term) ||
        String(item?.email || '').toLowerCase().includes(term) ||
        String(item?.status || '').toLowerCase().includes(term) ||
        String(item?.method_type || '').toLowerCase().includes(term);

      const matchesStatus =
        payoutStatusFilter === 'all' ||
        String(item?.status || '').toLowerCase() === payoutStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payoutRequests, searchTerm, payoutStatusFilter]);

  const revenueReserveSummary = useMemo(() => {
    return adCampaigns.reduce(
      (acc, campaign) => {
        const split = getReservedFromCampaign(campaign, revenueSharePolicy);
        acc.gross += split.gross;
        acc.creator_reserved += split.creator_reserved;
        acc.platform_kept += split.platform_kept;
        return acc;
      },
      {
        gross: 0,
        creator_reserved: 0,
        platform_kept: 0,
      }
    );
  }, [adCampaigns, revenueSharePolicy]);

  const overviewCards = useMemo(() => {
    const pendingQueue = mergedPendingItems.length;

    const approvedVideos = videos.filter(
      (video) => String(video?.moderation_status).toLowerCase() === 'approved'
    ).length;

    const rejectedVideos = videos.filter(
      (video) => String(video?.moderation_status).toLowerCase() === 'rejected'
    ).length;

    const pendingReports = reports.filter(
      (report) => String(report?.status).toLowerCase() === 'pending'
    ).length;

    const pausedCampaigns = adCampaigns.filter(
      (campaign) => getCampaignRuntimeStatus(campaign) === 'paused'
    ).length;

    const runningCampaigns = adCampaigns.filter(
      (campaign) => getCampaignRuntimeStatus(campaign) === 'running'
    ).length;

    const endedCampaigns = adCampaigns.filter(
      (campaign) => getCampaignRuntimeStatus(campaign) === 'ended'
    ).length;

    const walletExhaustedCampaigns = adCampaigns.filter(
      (campaign) => String(campaign?.pause_reason || '').toLowerCase() === 'wallet_exhausted'
    ).length;

    const pendingMonetizationApplications = monetizationApplications.filter(
      (application) => String(application?.status || '').toLowerCase() === 'pending'
    ).length;

    const pendingPayouts = payoutRequests.filter(
      (item) => String(item?.status || '').toLowerCase() === 'pending'
    ).length;

    return [
      { label: 'All Videos', value: videos.length },
      { label: 'Pending Video Reviews', value: pendingQueue },
      { label: 'Channels', value: channels.length },
      { label: 'Approved Videos', value: approvedVideos },
      { label: 'Rejected Videos', value: rejectedVideos },
      { label: 'Pending Reports', value: pendingReports },
      { label: 'Categories', value: categories.length },
      { label: 'External Plans', value: plans.length },
      { label: 'Ad Campaigns', value: adCampaigns.length },
      { label: 'Pending Ad Campaigns', value: pendingAdCampaigns.length },
      { label: 'Running Ad Campaigns', value: runningCampaigns },
      { label: 'Paused Ad Campaigns', value: pausedCampaigns },
      { label: 'Wallet Exhausted Ads', value: walletExhaustedCampaigns },
      { label: 'Ended Ad Campaigns', value: endedCampaigns },
      { label: 'Ad Videos', value: adVideos.length },
      { label: 'Pending Ad Videos', value: pendingAdVideos.length },
      { label: 'Support Conversations', value: supportConversations.length },
      { label: 'Monetization Applications', value: monetizationApplications.length },
      { label: 'Pending Monetization', value: pendingMonetizationApplications },
      { label: 'Pending Payouts', value: pendingPayouts },
      { label: 'Creator Reserved', value: formatMoney(revenueReserveSummary.creator_reserved) },
      { label: 'Platform Kept', value: formatMoney(revenueReserveSummary.platform_kept) },
    ];
  }, [
    videos,
    mergedPendingItems,
    channels,
    reports,
    categories,
    plans,
    adCampaigns,
    pendingAdCampaigns,
    adVideos,
    pendingAdVideos,
    supportConversations,
    monetizationApplications,
    revenueReserveSummary,
    payoutRequests,
  ]);

  async function handleApproveVideo(video) {
    if (!adminService.updateAdminVideoStatus) {
      setError('Admin video status update is not available in adminService yet');
      return;
    }

    const actionId = `approve-video-${video.id}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.updateAdminVideoStatus(video.id, {
        status: 'published',
        moderation_status: 'approved',
      });
      setSuccessMessage('Video approved');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Video approval failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleRejectVideo(video) {
    if (!adminService.updateAdminVideoStatus) {
      setError('Admin video status update is not available in adminService yet');
      return;
    }

    const reviewerNote = window.prompt('Reason for rejection (optional):', '') || '';
    const actionId = `reject-video-${video.id}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.updateAdminVideoStatus(video.id, {
        status: 'rejected',
        moderation_status: 'rejected',
        reviewer_note: reviewerNote,
      });
      setSuccessMessage('Video rejected');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Video rejection failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleDeleteVideo(video) {
    if (!adminService.deleteAdminVideo) {
      setError('Admin video delete is not available in adminService yet');
      return;
    }

    const confirmed = window.confirm(`Delete "${video.title}"?`);
    if (!confirmed) return;

    const actionId = `delete-video-${video.id}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.deleteAdminVideo(video.id);
      setSuccessMessage('Video deleted');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Video delete failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleApprovePendingItem(item) {
    const videoId = item?.video_id || item?.video?.id;
    if (!videoId) {
      setError('Video ID not found for this pending item');
      return;
    }

    const actionId = `approve-pending-${videoId}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.updateAdminVideoStatus(videoId, {
        status: 'published',
        moderation_status: 'approved',
      });
      setSuccessMessage('Pending video approved');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Approval failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleRejectPendingItem(item) {
    const videoId = item?.video_id || item?.video?.id;
    if (!videoId) {
      setError('Video ID not found for this pending item');
      return;
    }

    const reviewerNote = window.prompt('Reason for rejection (optional):', '') || '';
    const actionId = `reject-pending-${videoId}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.updateAdminVideoStatus(videoId, {
        status: 'rejected',
        moderation_status: 'rejected',
        reviewer_note: reviewerNote,
      });
      setSuccessMessage('Pending video rejected');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Rejection failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleReportStatus(reportId, status) {
    const actionId = `report-${reportId}-${status}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.updateReportStatus(reportId, status);
      setSuccessMessage(`Report marked as ${status}`);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Failed to update report');
    } finally {
      setActionLoadingId('');
    }
  }

  function handleCategoryFormChange(event) {
    const { name, value } = event.target;
    setCategoryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function startEditCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category?.name || category?.title || '',
      slug: category?.slug || '',
      parent_id: category?.parent_id || category?.parentId || '',
      description: category?.description || '',
    });
    setActiveTab('categories');
  }

  function resetCategoryForm() {
    setEditingCategoryId(null);
    setCategoryForm({
      name: '',
      slug: '',
      parent_id: '',
      description: '',
    });
  }

  async function handleCategorySubmit(event) {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug,
      parent_id: categoryForm.parent_id ? Number(categoryForm.parent_id) : null,
      description: categoryForm.description,
    };

    try {
      if (editingCategoryId) {
        await adminService.updateCategory(editingCategoryId, payload);
        setSuccessMessage('Category updated');
      } else {
        await adminService.createCategory(payload);
        setSuccessMessage('Category created');
      }

      resetCategoryForm();
      await loadAll();
    } catch (err) {
      setError(err.message || 'Category save failed');
    }
  }

  async function handleDeleteCategory(categoryId) {
    const confirmed = window.confirm('Delete this category?');
    if (!confirmed) return;

    const actionId = `delete-category-${categoryId}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.deleteCategory(categoryId);
      setSuccessMessage('Category deleted');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setActionLoadingId('');
    }
  }

  function handleChannelFormChange(event) {
    const { name, value } = event.target;
    setChannelForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function startEditChannel(channel) {
    setEditingChannelId(channel.id);
    setChannelForm({
      channel_name: channel?.channel_name || '',
      channel_handle: channel?.channel_handle || '',
      channel_slug: channel?.channel_slug || '',
      avatar_url: channel?.avatar_url || '',
      banner_url: channel?.banner_url || '',
      bio: channel?.bio || '',
      status: channel?.status || 'active',
    });
    setActiveTab('channels');
  }

  function resetChannelForm() {
    setEditingChannelId(null);
    setChannelForm({
      channel_name: '',
      channel_handle: '',
      channel_slug: '',
      avatar_url: '',
      banner_url: '',
      bio: '',
      status: 'active',
    });
  }

  async function handleChannelSubmit(event) {
    event.preventDefault();

    if (!editingChannelId) {
      setError('Select a channel from the table first before updating');
      return;
    }

    if (!adminService.updateAdminChannel) {
      setError('Admin channel update is not available in adminService yet');
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      await adminService.updateAdminChannel(editingChannelId, channelForm);
      setSuccessMessage('Channel updated');
      resetChannelForm();
      await loadAll();
    } catch (err) {
      setError(err.message || 'Channel update failed');
    }
  }

  async function handleDeleteChannel(channelId) {
    if (!adminService.deleteAdminChannel) {
      setError('Admin channel delete is not available in adminService yet');
      return;
    }

    const confirmed = window.confirm('Delete this channel?');
    if (!confirmed) return;

    const actionId = `delete-channel-${channelId}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.deleteAdminChannel(channelId);
      setSuccessMessage('Channel deleted');
      if (editingChannelId === channelId) {
        resetChannelForm();
      }
      await loadAll();
    } catch (err) {
      setError(err.message || 'Channel delete failed');
    } finally {
      setActionLoadingId('');
    }
  }

  function handleAdToolsChange(event) {
    const { name, value } = event.target;
    setAdTools((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleApproveCampaign(campaignIdOverride = '') {
    const campaignId = campaignIdOverride || adTools.campaignId;

    if (!campaignId) {
      setError('Enter a campaign ID');
      return;
    }

    const actionId = `approve-campaign-${campaignId}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.approveAdCampaign(campaignId);
      setSuccessMessage('Ad campaign approved');
      if (!campaignIdOverride) {
        setAdTools((prev) => ({ ...prev, campaignId }));
      }
      await loadAll();
    } catch (err) {
      setError(err.message || 'Campaign approval failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handlePauseCampaign(campaignIdOverride = '') {
    const campaignId = campaignIdOverride || adTools.campaignId;

    if (!campaignId) {
      setError('Enter a campaign ID');
      return;
    }

    const actionId = `pause-campaign-${campaignId}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.pauseAdCampaign(campaignId);
      setSuccessMessage('Ad campaign paused');
      if (!campaignIdOverride) {
        setAdTools((prev) => ({ ...prev, campaignId }));
      }
      await loadAll();
    } catch (err) {
      setError(err.message || 'Campaign pause failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleDeleteCampaign(campaignIdOverride = '') {
    const campaignId = campaignIdOverride || adTools.campaignId;

    if (!campaignId) {
      setError('Enter a campaign ID');
      return;
    }

    const confirmed = window.confirm(`Delete campaign ${campaignId}?`);
    if (!confirmed) return;

    const actionId = `delete-campaign-${campaignId}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.deleteAdCampaign(campaignId);
      setSuccessMessage('Ad campaign deleted');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Campaign delete failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleApproveAdVideo(adVideoIdOverride = '') {
    const adVideoId = adVideoIdOverride || adTools.adVideoId;

    if (!adVideoId) {
      setError('Enter an ad video ID');
      return;
    }

    const actionId = `approve-ad-video-${adVideoId}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.approveAdVideo(adVideoId);
      setSuccessMessage('Ad video approved');
      if (!adVideoIdOverride) {
        setAdTools((prev) => ({ ...prev, adVideoId }));
      }
      await loadAll();
    } catch (err) {
      setError(err.message || 'Ad video approval failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleFetchCampaignStats() {
    if (!adTools.statsCampaignId) {
      setError('Enter a campaign ID for stats');
      return;
    }

    const actionId = `campaign-stats-${adTools.statsCampaignId}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      const stats = await adminService.getCampaignStats(adTools.statsCampaignId);
      setCampaignStats(stats);
      setSuccessMessage('Campaign stats loaded');
    } catch (err) {
      setError(err.message || 'Stats fetch failed');
      setCampaignStats(null);
    } finally {
      setActionLoadingId('');
    }
  }

  function renderOverview() {
    return (
      <div className="admin-section">
        <div className="admin-cards-grid">
          {overviewCards.map((card) => (
            <div className="admin-card" key={card.label}>
              <p className="admin-card-label">{card.label}</p>
              <h3 className="admin-card-value">{card.value}</h3>
            </div>
          ))}
        </div>

        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Admin Account</h3>
            <div className="admin-meta-list">
              <div><span>Name:</span> {me?.user?.full_name || me?.user?.name || '—'}</div>
              <div><span>Email:</span> {me?.user?.email || '—'}</div>
              <div><span>Status:</span> {me?.user?.status || '—'}</div>
              <div><span>Roles:</span> {Array.isArray(me?.roles) ? me.roles.join(', ') : '—'}</div>
            </div>
          </div>

          <div className="admin-panel">
            <h3>Revenue Share Policy</h3>
            <div className="admin-meta-list">
              <div><span>Creator Share:</span> {revenueSharePolicy.creator_share_percent}%</div>
              <div><span>Platform Share:</span> {revenueSharePolicy.platform_share_percent}%</div>
              <div><span>Example Gross:</span> ${formatMoney(revenueSplitExample.gross_revenue)}</div>
              <div><span>Creator Reserve:</span> ${formatMoney(revenueSplitExample.creator_share_amount)}</div>
              <div><span>Platform Keep:</span> ${formatMoney(revenueSplitExample.platform_share_amount)}</div>
            </div>
          </div>
        </div>

        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Reserved Earnings Summary</h3>
            <div className="admin-meta-list">
              <div><span>Total Gross Ads:</span> ${formatMoney(revenueReserveSummary.gross)}</div>
              <div><span>Creators Owed:</span> ${formatMoney(revenueReserveSummary.creator_reserved)}</div>
              <div><span>Platform Reserved:</span> ${formatMoney(revenueReserveSummary.platform_kept)}</div>
              <div><span>Pending Creator Payouts:</span> ${formatMoney(revenueReserveSummary.creator_reserved)}</div>
              <div><span>Pending Withdrawal Requests:</span> {formatCount(payoutRequests.filter((x) => String(x.status).toLowerCase() === 'pending').length)}</div>
            </div>
          </div>

          <div className="admin-panel">
            <h3>Live Admin Scope</h3>
            <pre className="admin-json-block">
{`- Global all videos admin list
- Pending video review from all videos + moderation queue
- Admin channels list, edit, delete
- Reports moderation
- Categories create, edit, delete
- External posting plans list
- Ad campaigns list + filters
- Ad videos list + pending list
- Support chat
- Monetization application approvals
- Revenue split policy
- Creator reserved earnings visibility
- Creator payout request approvals / payment`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  function renderVideos() {
    return (
      <div className="admin-section">
        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search"
            placeholder="Search all videos, creators, channels, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="admin-btn secondary" onClick={loadAll}>
            Refresh
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Creator</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Moderation</th>
                <th>Views</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="admin-empty">No videos found</td>
                </tr>
              ) : (
                filteredVideos.map((video) => (
                  <tr key={video.id}>
                    <td>
                      <div className="admin-title-cell">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt={video.title} className="admin-thumb" />
                        ) : (
                          <div className="admin-thumb admin-thumb-placeholder">No image</div>
                        )}
                        <div>
                          <div className="admin-strong">{video.title}</div>
                          <div className="admin-subtext">{video.slug || 'No slug'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-strong">{video.creator_name || 'Unknown creator'}</div>
                      <div className="admin-subtext">{video.creator_email || '—'}</div>
                    </td>
                    <td>{video.channel_name || 'No channel'}</td>
                    <td>
                      <span className={`admin-badge ${getStatusClass(video.status)}`}>
                        {video.status || 'unknown'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${getStatusClass(video.moderation_status)}`}>
                        {video.moderation_status || 'pending'}
                      </span>
                    </td>
                    <td>{formatCount(video.views_count)}</td>
                    <td>{formatDate(video.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-btn success"
                          disabled={actionLoadingId === `approve-video-${video.id}`}
                          onClick={() => handleApproveVideo(video)}
                        >
                          Approve
                        </button>
                        <button
                          className="admin-btn warning"
                          disabled={actionLoadingId === `reject-video-${video.id}`}
                          onClick={() => handleRejectVideo(video)}
                        >
                          Reject
                        </button>
                        <button
                          className="admin-btn danger"
                          disabled={actionLoadingId === `delete-video-${video.id}`}
                          onClick={() => handleDeleteVideo(video)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderModeration() {
    return (
      <div className="admin-section">
        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search"
            placeholder="Search pending videos, creators, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="admin-btn secondary" onClick={loadAll}>
            Refresh
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Video ID</th>
                <th>Video</th>
                <th>Creator</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan="7" className="admin-empty">No pending videos found</td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr key={item.id}>
                    <td>{item.video_id || item.id}</td>
                    <td>
                      <div className="admin-title-cell">
                        {item.video?.thumbnail_url ? (
                          <img
                            src={item.video.thumbnail_url}
                            alt={item.video?.title || 'Video'}
                            className="admin-thumb"
                          />
                        ) : (
                          <div className="admin-thumb admin-thumb-placeholder">No image</div>
                        )}
                        <div>
                          <div className="admin-strong">{item.video?.title || 'Untitled'}</div>
                          <div className="admin-subtext">{item.video?.slug || 'No slug'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{item.video?.creator_name || 'Unknown creator'}</td>
                    <td>
                      <span className={`admin-badge ${getStatusClass(item.queue_status)}`}>
                        {item.queue_status}
                      </span>
                    </td>
                    <td>{item.reason || 'Pending from videos table'}</td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-btn success"
                          disabled={actionLoadingId === `approve-pending-${item.video_id}`}
                          onClick={() => handleApprovePendingItem(item)}
                        >
                          Approve
                        </button>
                        <button
                          className="admin-btn warning"
                          disabled={actionLoadingId === `reject-pending-${item.video_id}`}
                          onClick={() => handleRejectPendingItem(item)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderChannels() {
    return (
      <div className="admin-section">
        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Edit Channel</h3>

            <form className="admin-form" onSubmit={handleChannelSubmit}>
              <input
                className="admin-input"
                name="channel_name"
                placeholder="Channel name"
                value={channelForm.channel_name}
                onChange={handleChannelFormChange}
                required
              />
              <input
                className="admin-input"
                name="channel_handle"
                placeholder="Channel handle"
                value={channelForm.channel_handle}
                onChange={handleChannelFormChange}
                required
              />
              <input
                className="admin-input"
                name="channel_slug"
                placeholder="Channel slug"
                value={channelForm.channel_slug}
                onChange={handleChannelFormChange}
                required
              />
              <input
                className="admin-input"
                name="avatar_url"
                placeholder="Avatar URL"
                value={channelForm.avatar_url}
                onChange={handleChannelFormChange}
              />
              <input
                className="admin-input"
                name="banner_url"
                placeholder="Banner URL"
                value={channelForm.banner_url}
                onChange={handleChannelFormChange}
              />
              <textarea
                className="admin-input admin-textarea"
                name="bio"
                placeholder="Bio"
                value={channelForm.bio}
                onChange={handleChannelFormChange}
              />
              <select
                className="admin-input"
                name="status"
                value={channelForm.status}
                onChange={handleChannelFormChange}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="suspended">suspended</option>
              </select>

              <div className="admin-actions">
                <button className="admin-btn success" type="submit">
                  Update Channel
                </button>
                <button className="admin-btn secondary" type="button" onClick={resetChannelForm}>
                  Reset
                </button>
              </div>
            </form>
          </div>

          <div className="admin-panel">
            <h3>How it works</h3>
            <pre className="admin-json-block">
{`- Click Edit on a channel row
- Update the details on the left
- Save changes
- Delete removes the channel entirely`}
            </pre>
          </div>
        </div>

        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search"
            placeholder="Search channels, handles, owners, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="admin-btn secondary" onClick={loadAll}>
            Refresh
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Channel</th>
                <th>Handle</th>
                <th>Slug</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChannels.length === 0 ? (
                <tr>
                  <td colSpan="7" className="admin-empty">No channels found</td>
                </tr>
              ) : (
                filteredChannels.map((channel) => (
                  <tr key={channel.id}>
                    <td>{channel.id}</td>
                    <td>
                      <div className="admin-strong">{channel.channel_name || 'Untitled channel'}</div>
                      <div className="admin-subtext">{channel.bio || '—'}</div>
                    </td>
                    <td>{channel.channel_handle || '—'}</td>
                    <td>{channel.channel_slug || '—'}</td>
                    <td>
                      <div className="admin-strong">{channel.full_name || 'Unknown user'}</div>
                      <div className="admin-subtext">{channel.email || '—'}</div>
                    </td>
                    <td>
                      <span className={`admin-badge ${getStatusClass(channel.status)}`}>
                        {channel.status || 'unknown'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-btn secondary" onClick={() => startEditChannel(channel)}>
                          Edit
                        </button>
                        <button
                          className="admin-btn danger"
                          disabled={actionLoadingId === `delete-channel-${channel.id}`}
                          onClick={() => handleDeleteChannel(channel.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="admin-section">
        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="admin-btn secondary" onClick={loadAll}>
            Refresh
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Video</th>
                <th>Reason</th>
                <th>Reported By</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="admin-empty">No reports found</td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.id}</td>
                    <td>{report.video_title}</td>
                    <td>{report.reason}</td>
                    <td>{report.reported_by}</td>
                    <td>
                      <span className={`admin-badge ${getStatusClass(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>{formatDate(report.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-btn success"
                          disabled={actionLoadingId === `report-${report.id}-resolved`}
                          onClick={() => handleReportStatus(report.id, 'resolved')}
                        >
                          Resolve
                        </button>
                        <button
                          className="admin-btn secondary"
                          disabled={actionLoadingId === `report-${report.id}-reviewed`}
                          onClick={() => handleReportStatus(report.id, 'reviewed')}
                        >
                          Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderCategories() {
    return (
      <div className="admin-section">
        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>{editingCategoryId ? 'Edit Category' : 'Create Category'}</h3>

            <form className="admin-form" onSubmit={handleCategorySubmit}>
              <input
                className="admin-input"
                name="name"
                placeholder="Category name"
                value={categoryForm.name}
                onChange={handleCategoryFormChange}
                required
              />
              <input
                className="admin-input"
                name="slug"
                placeholder="Slug"
                value={categoryForm.slug}
                onChange={handleCategoryFormChange}
              />
              <input
                className="admin-input"
                name="parent_id"
                placeholder="Parent ID"
                value={categoryForm.parent_id}
                onChange={handleCategoryFormChange}
              />
              <textarea
                className="admin-input admin-textarea"
                name="description"
                placeholder="Description"
                value={categoryForm.description}
                onChange={handleCategoryFormChange}
              />

              <div className="admin-actions">
                <button className="admin-btn success" type="submit">
                  {editingCategoryId ? 'Update Category' : 'Create Category'}
                </button>
                <button className="admin-btn secondary" type="button" onClick={resetCategoryForm}>
                  Reset
                </button>
              </div>
            </form>
          </div>

          <div className="admin-panel">
            <h3>Category Tree</h3>
            <pre className="admin-json-block">
              {JSON.stringify(categoryTree || [], null, 2)}
            </pre>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-empty">No categories found</td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td>{getCategoryName(category)}</td>
                    <td>{category.slug || '—'}</td>
                    <td>{category.parent_id || category.parentId || '—'}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-btn secondary" onClick={() => startEditCategory(category)}>
                          Edit
                        </button>
                        <button
                          className="admin-btn danger"
                          disabled={actionLoadingId === `delete-category-${category.id}`}
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderPlans() {
    return (
      <div className="admin-section">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Plan</th>
                <th>Price</th>
                <th>Billing</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-empty">No external posting plans found</td>
                </tr>
              ) : (
                plans.map((plan, index) => (
                  <tr key={plan.id || index}>
                    <td>{plan.id || '—'}</td>
                    <td>{plan.name || plan.title || `Plan ${index + 1}`}</td>
                    <td>{plan.price || plan.amount || '—'}</td>
                    <td>{plan.interval || plan.billing_cycle || '—'}</td>
                    <td>{plan.status || 'active'}</td>
                    <td>{plan.description || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderAds() {
    return (
      <div className="admin-section">
        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search"
            placeholder="Search campaigns, advertiser, ad videos, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="admin-input"
            style={{ maxWidth: 220 }}
            value={adsStatusFilter}
            onChange={(e) => setAdsStatusFilter(e.target.value)}
          >
            <option value="all">All Ads</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="running">Still Running</option>
            <option value="paused">Paused</option>
            <option value="wallet_exhausted">Wallet Exhausted</option>
            <option value="ended">Ended</option>
            <option value="scheduled">Scheduled</option>
            <option value="rejected">Rejected</option>
          </select>

          <button className="admin-btn secondary" onClick={loadAll}>
            Refresh
          </button>
        </div>

        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Ad Campaign Controls</h3>
            <input
              className="admin-input"
              name="campaignId"
              placeholder="Campaign ID"
              value={adTools.campaignId}
              onChange={handleAdToolsChange}
            />
            <div className="admin-actions" style={{ marginTop: 12 }}>
              <button
                className="admin-btn success"
                disabled={actionLoadingId === `approve-campaign-${adTools.campaignId}`}
                onClick={() => handleApproveCampaign()}
              >
                Approve Campaign
              </button>
              <button
                className="admin-btn warning"
                disabled={actionLoadingId === `pause-campaign-${adTools.campaignId}`}
                onClick={() => handlePauseCampaign()}
              >
                Pause Campaign
              </button>
              <button
                className="admin-btn danger"
                disabled={actionLoadingId === `delete-campaign-${adTools.campaignId}`}
                onClick={() => handleDeleteCampaign()}
              >
                Delete Campaign
              </button>
            </div>
          </div>

          <div className="admin-panel">
            <h3>Approve Ad Video</h3>
            <input
              className="admin-input"
              name="adVideoId"
              placeholder="Ad Video ID"
              value={adTools.adVideoId}
              onChange={handleAdToolsChange}
            />
            <div className="admin-actions" style={{ marginTop: 12 }}>
              <button
                className="admin-btn success"
                disabled={actionLoadingId === `approve-ad-video-${adTools.adVideoId}`}
                onClick={() => handleApproveAdVideo()}
              >
                Approve Ad Video
              </button>
            </div>
          </div>
        </div>

        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Campaign Stats Lookup</h3>
            <input
              className="admin-input"
              name="statsCampaignId"
              placeholder="Campaign ID for stats"
              value={adTools.statsCampaignId}
              onChange={handleAdToolsChange}
            />
            <div className="admin-actions" style={{ marginTop: 12 }}>
              <button
                className="admin-btn secondary"
                disabled={actionLoadingId === `campaign-stats-${adTools.statsCampaignId}`}
                onClick={handleFetchCampaignStats}
              >
                Load Stats
              </button>
            </div>
          </div>

          <div className="admin-panel">
            <h3>Revenue Reserve Rules</h3>
            <div className="admin-meta-list">
              <div><span>Creator Share:</span> {revenueSharePolicy.creator_share_percent}%</div>
              <div><span>Platform Share:</span> {revenueSharePolicy.platform_share_percent}%</div>
              <div><span>Total Creators Owed:</span> ${formatMoney(revenueReserveSummary.creator_reserved)}</div>
              <div><span>Total Platform Keep:</span> ${formatMoney(revenueReserveSummary.platform_kept)}</div>
            </div>
          </div>
        </div>

        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Campaign Stats Result</h3>
            <pre className="admin-json-block">
              {JSON.stringify(campaignStats || {}, null, 2)}
            </pre>
          </div>

          <div className="admin-panel">
            <h3>Ads Endpoint Scope</h3>
            <pre className="admin-json-block">
{`Creator side
- POST /api/ads/campaigns
- POST /api/ads/videos

Admin side
- GET /api/ads/campaigns
- GET /api/ads/campaigns/pending
- PUT /api/ads/campaigns/:id/approve
- PUT /api/ads/campaigns/:id/pause
- DELETE /api/ads/campaigns/:id
- GET /api/ads/videos
- GET /api/ads/videos/pending
- PUT /api/ads/videos/:id/approve

Performance
- GET /api/ads/player
- POST /api/ads/impressions
- POST /api/ads/clicks
- POST /api/ads/skips
- GET /api/ads/campaigns/:id/stats`}
            </pre>
          </div>
        </div>

        <div className="admin-table-wrap" style={{ marginTop: 20 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Campaign ID</th>
                <th>Advertiser</th>
                <th>Title</th>
                <th>Budget</th>
                <th>Creator Reserve</th>
                <th>Platform Keep</th>
                <th>Skip</th>
                <th>Status</th>
                <th>Dates</th>
                <th>Notice</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="11" className="admin-empty">No ad campaigns found</td>
                </tr>
              ) : (
                filteredAdCampaigns.map((campaign) => {
                  const split = getReservedFromCampaign(campaign, revenueSharePolicy);

                  return (
                    <tr key={campaign.id}>
                      <td>{campaign.id}</td>
                      <td>
                        <div className="admin-strong">{campaign.advertiser_name}</div>
                        <div className="admin-subtext">{campaign.advertiser_email || '—'}</div>
                      </td>
                      <td>
                        <div className="admin-strong">{campaign.title}</div>
                        <div className="admin-subtext">{campaign.uuid || '—'}</div>
                      </td>
                      <td>${formatMoney(campaign.budget)}</td>
                      <td>${formatMoney(split.creator_reserved)}</td>
                      <td>${formatMoney(split.platform_kept)}</td>
                      <td>{formatCount(campaign.skip_after_seconds)}s</td>
                      <td>
                        <span className={`admin-badge ${getStatusClass(getCampaignRuntimeStatus(campaign))}`}>
                          {getCampaignRuntimeStatus(campaign)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-subtext">Start: {formatDate(campaign.starts_at)}</div>
                        <div className="admin-subtext">End: {formatDate(campaign.ends_at)}</div>
                      </td>
                      <td>
                        {campaign.pause_notice ? (
                          <div>
                            <div className="admin-strong">{campaign.pause_notice}</div>
                            <div className="admin-subtext">
                              {campaign.pause_reason || 'paused'}
                              {campaign.paused_at ? ` • ${formatDate(campaign.paused_at)}` : ''}
                            </div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            className="admin-btn success"
                            disabled={actionLoadingId === `approve-campaign-${campaign.id}`}
                            onClick={() => handleApproveCampaign(campaign.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="admin-btn warning"
                            disabled={actionLoadingId === `pause-campaign-${campaign.id}`}
                            onClick={() => handlePauseCampaign(campaign.id)}
                          >
                            Pause
                          </button>
                          <button
                            className="admin-btn danger"
                            disabled={actionLoadingId === `delete-campaign-${campaign.id}`}
                            onClick={() => handleDeleteCampaign(campaign.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-table-wrap" style={{ marginTop: 20 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ad Video ID</th>
                <th>Title</th>
                <th>Campaign</th>
                <th>Advertiser</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdVideos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="admin-empty">No ad videos found</td>
                </tr>
              ) : (
                filteredAdVideos.map((adVideo) => (
                  <tr key={adVideo.id}>
                    <td>{adVideo.id}</td>
                    <td>
                      <div className="admin-strong">{adVideo.title}</div>
                      <div className="admin-subtext">{adVideo.video_key || 'No video key'}</div>
                    </td>
                    <td>
                      <div className="admin-strong">{adVideo.campaign_title || `Campaign ${adVideo.campaign_id}`}</div>
                      <div className="admin-subtext">Campaign ID: {adVideo.campaign_id || '—'}</div>
                    </td>
                    <td>{adVideo.advertiser_name || '—'}</td>
                    <td>{formatCount(adVideo.duration_seconds)}s</td>
                    <td>
                      <span className={`admin-badge ${getStatusClass(adVideo.status)}`}>
                        {adVideo.status}
                      </span>
                    </td>
                    <td>{formatDate(adVideo.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-btn success"
                          disabled={actionLoadingId === `approve-ad-video-${adVideo.id}`}
                          onClick={() => handleApproveAdVideo(adVideo.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="admin-btn secondary"
                          onClick={() =>
                            setAdTools((prev) => ({
                              ...prev,
                              adVideoId: String(adVideo.id),
                            }))
                          }
                        >
                          Use ID
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderSupport() {
    return (
      <div className="admin-section">
        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search"
            placeholder="Search subject, user, email, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="admin-input"
            style={{ maxWidth: 220 }}
            value={supportStatusFilter}
            onChange={(e) => setSupportStatusFilter(e.target.value)}
          >
            <option value="all">All Conversations</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>

          <button
            className="admin-btn secondary"
            onClick={() => loadSupportConversations(selectedSupportConversationId)}
          >
            Refresh
          </button>
        </div>

        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>All Conversations</h3>

            {supportLoading ? (
              <div className="admin-empty">Loading conversations...</div>
            ) : filteredSupportConversations.length === 0 ? (
              <div className="admin-empty">No support conversations found</div>
            ) : (
              <div className="videogad-video-table">
                {filteredSupportConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="videogad-video-row"
                    onClick={() => loadSupportConversation(conversation.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background:
                        Number(selectedSupportConversationId) === Number(conversation.id)
                          ? 'rgba(255,255,255,0.05)'
                          : undefined,
                      border:
                        Number(selectedSupportConversationId) === Number(conversation.id)
                          ? '1px solid rgba(255,255,255,0.14)'
                          : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="video-main">
                      <div>
                        <h4>{conversation.subject || `Conversation #${conversation.id}`}</h4>
                        <p>{conversation.user_full_name || conversation.user_email || 'Unknown user'}</p>
                        <p>{conversation.last_message_text || 'No message yet'}</p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span className={`admin-badge ${getStatusClass(conversation.status)}`}>
                        {conversation.status}
                      </span>
                      <span>{conversation.unread_count ? `${conversation.unread_count} unread` : 'read'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="admin-panel">
            <h3>Conversation Details</h3>

            {!selectedSupportConversationId ? (
              <div className="admin-empty">Select a support conversation first</div>
            ) : supportConversationLoading ? (
              <div className="admin-empty">Loading conversation...</div>
            ) : (
              <>
                <div className="marketplace-status-box" style={{ marginBottom: 16 }}>
                  <div className="marketplace-row">
                    <span>Subject</span>
                    <strong>{selectedSupportConversation?.subject || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>User</span>
                    <strong>{selectedSupportConversation?.user_full_name || selectedSupportConversation?.user_email || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Status</span>
                    <strong>{selectedSupportConversation?.status || '—'}</strong>
                  </div>
                </div>

                <div className="admin-actions" style={{ marginBottom: 16 }}>
                  <button className="admin-btn secondary" disabled={supportStatusUpdating} onClick={() => handleSupportStatusChange('open')}>Open</button>
                  <button className="admin-btn warning" disabled={supportStatusUpdating} onClick={() => handleSupportStatusChange('pending')}>Pending</button>
                  <button className="admin-btn success" disabled={supportStatusUpdating} onClick={() => handleSupportStatusChange('closed')}>Closed</button>
                </div>

                <div className="admin-json-block" style={{ marginBottom: 16, minHeight: 180 }}>
                  {supportMessages.length
                    ? supportMessages.map((message) => {
                        const senderName = message?.full_name || message?.email || message?.sender_role || 'User';
                        return `[${formatDate(message.created_at)}] ${senderName}: ${message.message_text}`;
                      }).join('\n\n')
                    : 'No messages yet'}
                </div>

                <form onSubmit={handleSendSupportReply} className="admin-form">
                  <textarea
                    className="admin-input admin-textarea"
                    placeholder="Write admin reply..."
                    value={supportReplyMessage}
                    onChange={(e) => setSupportReplyMessage(e.target.value)}
                  />
                  <div className="admin-actions">
                    <button className="admin-btn success" disabled={supportSending} type="submit">
                      Send Reply
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderMonetization() {
    return (
      <div className="admin-section">
        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search"
            placeholder="Search public name, email, status."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="admin-input"
            style={{ maxWidth: 220 }}
            value={monetizationStatusFilter}
            onChange={(e) => setMonetizationStatusFilter(e.target.value)}
          >
            <option value="all">All Applications</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            className="admin-btn secondary"
            onClick={() => loadMonetizationApplications(selectedMonetizationApplicationId)}
          >
            Refresh
          </button>
        </div>

        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Revenue Sharing Formula</h3>
            <div className="admin-meta-list">
              <div><span>Creator:</span> {revenueSharePolicy.creator_share_percent}%</div>
              <div><span>Platform:</span> {revenueSharePolicy.platform_share_percent}%</div>
              <div><span>$100 Example Creator:</span> ${formatMoney(revenueSplitExample.creator_share_amount)}</div>
              <div><span>$100 Example Platform:</span> ${formatMoney(revenueSplitExample.platform_share_amount)}</div>
            </div>
          </div>

          <div className="admin-panel">
            <h3>Admin Reserve View</h3>
            <div className="admin-meta-list">
              <div><span>Total Ad Revenue Seen:</span> ${formatMoney(revenueReserveSummary.gross)}</div>
              <div><span>Reserved For Creators:</span> ${formatMoney(revenueReserveSummary.creator_reserved)}</div>
              <div><span>Reserved For Platform:</span> ${formatMoney(revenueReserveSummary.platform_kept)}</div>
              <div><span>Payout Safe Balance:</span> ${formatMoney(revenueReserveSummary.creator_reserved)}</div>
            </div>
          </div>
        </div>

        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Monetization Applications</h3>

            {monetizationLoading ? (
              <div className="admin-empty">Loading monetization applications...</div>
            ) : filteredMonetizationApplications.length === 0 ? (
              <div className="admin-empty">No monetization applications found</div>
            ) : (
              <div className="videogad-video-table">
                {filteredMonetizationApplications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    className="videogad-video-row"
                    onClick={() => loadMonetizationApplication(application.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background:
                        Number(selectedMonetizationApplicationId) === Number(application.id)
                          ? 'rgba(255,255,255,0.05)'
                          : undefined,
                      border:
                        Number(selectedMonetizationApplicationId) === Number(application.id)
                          ? '1px solid rgba(255,255,255,0.14)'
                          : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="video-main">
                      <div>
                        <h4>{application.public_name || application.full_name || `Application #${application.id}`}</h4>
                        <p>{application.email || 'No email'}</p>
                        <p>Subscribers: {formatCount(application.subscriber_count)}</p>
                        <p>Views: {formatCount(application.total_video_views)} • Watch Hours: {formatHours(application.total_watch_hours)}h</p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span className={`admin-badge ${getStatusClass(application.status)}`}>
                        {application.status}
                      </span>
                      <span>
                        {application.has_active_external_subscription ? 'Subscription Active' : 'No Active Subscription'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="admin-panel">
            <h3>Application Details</h3>

            {!selectedMonetizationApplicationId ? (
              <div className="admin-empty">Select a monetization application first</div>
            ) : !selectedMonetizationApplication ? (
              <div className="admin-empty">Loading application.</div>
            ) : (
              <>
                <div className="marketplace-status-box" style={{ marginBottom: 16 }}>
                  <div className="marketplace-row">
                    <span>Creator</span>
                    <strong>
                      {selectedMonetizationApplication.public_name ||
                        selectedMonetizationApplication.full_name ||
                        '—'}
                    </strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Email</span>
                    <strong>{selectedMonetizationApplication.email || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Status</span>
                    <strong>{selectedMonetizationApplication.status || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Subscribers</span>
                    <strong>{formatCount(selectedMonetizationApplication.subscriber_count)}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Total Views</span>
                    <strong>{formatCount(selectedMonetizationApplication.total_video_views)}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Watch Hours</span>
                    <strong>{formatHours(selectedMonetizationApplication.total_watch_hours)}h</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Revenue Formula</span>
                    <strong>
                      Creator {revenueSharePolicy.creator_share_percent}% / Platform {revenueSharePolicy.platform_share_percent}%
                    </strong>
                  </div>
                  <div className="marketplace-row">
                    <span>$100 Example</span>
                    <strong>
                      Creator ${formatMoney(revenueSplitExample.creator_share_amount)} / Platform ${formatMoney(revenueSplitExample.platform_share_amount)}
                    </strong>
                  </div>
                  {selectedMonetizationApplication.admin_note ? (
                    <div className="marketplace-row">
                      <span>Admin Note</span>
                      <strong>{selectedMonetizationApplication.admin_note}</strong>
                    </div>
                  ) : null}
                </div>

                <div className="admin-actions">
                  <button
                    className="admin-btn success"
                    disabled={monetizationActionLoading}
                    onClick={() => handleMonetizationDecision('approved')}
                  >
                    Approve
                  </button>

                  <button
                    className="admin-btn warning"
                    disabled={monetizationActionLoading}
                    onClick={() => handleMonetizationDecision('rejected')}
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderPayouts() {
    return (
      <div className="admin-section">
        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search"
            placeholder="Search creator, email, method, payout status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="admin-input"
            style={{ maxWidth: 220 }}
            value={payoutStatusFilter}
            onChange={(e) => setPayoutStatusFilter(e.target.value)}
          >
            <option value="all">All Payouts</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>

          <button
            className="admin-btn secondary"
            onClick={() => loadPayoutRequests(selectedPayoutRequestId)}
          >
            Refresh
          </button>
        </div>

        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Payout Requests</h3>

            {payoutLoading ? (
              <div className="admin-empty">Loading payout requests...</div>
            ) : filteredPayoutRequests.length === 0 ? (
              <div className="admin-empty">No payout requests found</div>
            ) : (
              <div className="videogad-video-table">
                {filteredPayoutRequests.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="videogad-video-row"
                    onClick={() => {
                      setSelectedPayoutRequestId(Number(item.id));
                      setSelectedPayoutRequest(item);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background:
                        Number(selectedPayoutRequestId) === Number(item.id)
                          ? 'rgba(255,255,255,0.05)'
                          : undefined,
                      border:
                        Number(selectedPayoutRequestId) === Number(item.id)
                          ? '1px solid rgba(255,255,255,0.14)'
                          : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="video-main">
                      <div>
                        <h4>{item.public_name || item.full_name || `Payout #${item.id}`}</h4>
                        <p>{item.email || 'No email'}</p>
                        <p>Amount: ${formatMoney(item.amount)} • Method: {item.method_type || '—'}</p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span className={`admin-badge ${getStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                      <span>{item.currency_code || 'USD'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="admin-panel">
            <h3>Payout Details</h3>

            {!selectedPayoutRequestId ? (
              <div className="admin-empty">Select a payout request first</div>
            ) : !selectedPayoutRequest ? (
              <div className="admin-empty">Loading payout request.</div>
            ) : (
              <>
                <div className="marketplace-status-box" style={{ marginBottom: 16 }}>
                  <div className="marketplace-row">
                    <span>Creator</span>
                    <strong>{selectedPayoutRequest.public_name || selectedPayoutRequest.full_name || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Email</span>
                    <strong>{selectedPayoutRequest.email || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Amount</span>
                    <strong>${formatMoney(selectedPayoutRequest.amount)}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Currency</span>
                    <strong>{selectedPayoutRequest.currency_code || 'USD'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Status</span>
                    <strong>{selectedPayoutRequest.status || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Requested At</span>
                    <strong>{formatDate(selectedPayoutRequest.requested_at || selectedPayoutRequest.created_at)}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Available Balance</span>
                    <strong>${formatMoney(selectedPayoutRequest.available_balance)}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Method Type</span>
                    <strong>{selectedPayoutRequest.method_type || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Account Name</span>
                    <strong>{selectedPayoutRequest.account_name || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Account Number</span>
                    <strong>{selectedPayoutRequest.account_number || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Bank Name</span>
                    <strong>{selectedPayoutRequest.bank_name || '—'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Wallet Address</span>
                    <strong>{selectedPayoutRequest.wallet_address || '—'}</strong>
                  </div>
                </div>

                <div className="admin-actions">
                  <button
                    className="admin-btn success"
                    disabled={payoutActionLoading || String(selectedPayoutRequest.status || '').toLowerCase() === 'paid'}
                    onClick={() => handlePayoutStatus('approved')}
                  >
                    Approve
                  </button>

                  <button
                    className="admin-btn warning"
                    disabled={payoutActionLoading || String(selectedPayoutRequest.status || '').toLowerCase() === 'paid'}
                    onClick={() => handlePayoutStatus('rejected')}
                  >
                    Reject
                  </button>

                  <button
                    className="admin-btn secondary"
                    disabled={
                      payoutActionLoading ||
                      String(selectedPayoutRequest.status || '').toLowerCase() === 'rejected' ||
                      String(selectedPayoutRequest.status || '').toLowerCase() === 'paid'
                    }
                    onClick={handleMarkPayoutPaid}
                  >
                    Mark Paid
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'videos':
        return renderVideos();
      case 'moderation':
        return renderModeration();
      case 'channels':
        return renderChannels();
      case 'reports':
        return renderReports();
      case 'categories':
        return renderCategories();
      case 'plans':
        return renderPlans();
      case 'ads':
        return renderAds();
      case 'support':
        return renderSupport();
      case 'monetization':
        return renderMonetization();
      case 'payouts':
        return renderPayouts();
      default:
        return renderOverview();
    }
  }

  if (!sessionChecked || loading) {
    return <div className="admin-loading">Loading admin dashboard.</div>;
  }

  if (!authorized) {
    return (
      <div className="admin-dashboard-page">
        <main className="admin-main" style={{ width: '100%' }}>
          <div className="admin-alert error">
            You must login with an admin account to access this dashboard.
          </div>
          <button
            className="admin-btn secondary"
            onClick={() => {
              window.location.href = '/admin-login';
            }}
          >
            Go to Admin Login
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h2>VideoGad Admin</h2>
          <p>Marketplace control panel</p>
        </div>

        <nav className="admin-nav">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`admin-nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                setSearchTerm('');
                if (tab.key !== 'ads') setAdsStatusFilter('all');
                if (tab.key !== 'support') setSupportStatusFilter('all');
                if (tab.key !== 'monetization') setMonetizationStatusFilter('all');
                if (tab.key !== 'payouts') setPayoutStatusFilter('all');
                setActiveTab(tab.key);
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          className="admin-btn secondary admin-refresh-btn"
          onClick={() => {
            if (activeTab === 'support') {
              loadSupportConversations(selectedSupportConversationId);
              return;
            }

            if (activeTab === 'monetization') {
              loadMonetizationApplications(selectedMonetizationApplicationId);
              return;
            }

            if (activeTab === 'payouts') {
              loadPayoutRequests(selectedPayoutRequestId);
              return;
            }

            loadAll();
          }}
        >
          Reload data
        </button>

        <button className="admin-btn danger admin-refresh-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1>{TABS.find((tab) => tab.key === activeTab)?.label || 'Admin Dashboard'}</h1>
            <p>Full marketplace admin frontend</p>
          </div>
        </div>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {successMessage ? <div className="admin-alert success">{successMessage}</div> : null}

        {renderTabContent()}
      </main>
    </div>
  );
}

export default AdminDashboardPage;