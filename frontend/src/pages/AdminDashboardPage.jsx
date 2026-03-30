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
  return Number(value || 0).toLocaleString();
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

  if (endsAt && !Number.isNaN(endsAt) && endsAt < now) {
    return 'ended';
  }

  if (startsAt && !Number.isNaN(startsAt) && startsAt > now) {
    return 'scheduled';
  }

  if (baseStatus === 'active') {
    return 'running';
  }

  return baseStatus || 'unknown';
}

function campaignMatchesFilter(campaign, filterValue) {
  if (!filterValue || filterValue === 'all') return true;

  const dbStatus = String(campaign?.status || '').toLowerCase();
  const runtimeStatus = getCampaignRuntimeStatus(campaign);
  const pauseReason = String(campaign?.pause_reason || '').toLowerCase();

  if (filterValue === 'approved') {
    return dbStatus === 'active';
  }

  if (filterValue === 'still-running') {
    return runtimeStatus === 'running';
  }

  if (filterValue === 'wallet_exhausted') {
    return pauseReason === 'wallet_exhausted';
  }

  return runtimeStatus === filterValue || dbStatus === filterValue;
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
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
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
              <h3 className="admin-card-value">{formatCount(card.value)}</h3>
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
- Approve ad campaign
- Pause ad campaign
- Delete ad campaign
- Approve ad video
- Campaign stats lookup by ID
- Wallet exhausted notice for paused ads`}
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
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="admin-thumb"
                          />
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
                        <button
                          className="admin-btn secondary"
                          onClick={() => startEditChannel(channel)}
                        >
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
                        <button
                          className="admin-btn secondary"
                          onClick={() => startEditCategory(category)}
                        >
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
            <h3>Campaign Stats Result</h3>
            <pre className="admin-json-block">
              {JSON.stringify(campaignStats || {}, null, 2)}
            </pre>
          </div>
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

        <div className="admin-table-wrap" style={{ marginTop: 20 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Campaign ID</th>
                <th>Advertiser</th>
                <th>Title</th>
                <th>Destination</th>
                <th>Budget</th>
                <th>Skip</th>
                <th>DB Status</th>
                <th>Live Status</th>
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
                filteredAdCampaigns.map((campaign) => (
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
                    <td>{campaign.destination_url || '—'}</td>
                    <td>₦{formatMoney(campaign.budget)}</td>
                    <td>{formatCount(campaign.skip_after_seconds)}s</td>
                    <td>
                      <span className={`admin-badge ${getStatusClass(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
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
                        <button
                          className="admin-btn secondary"
                          onClick={() =>
                            setAdTools((prev) => ({
                              ...prev,
                              campaignId: String(campaign.id),
                              statsCampaignId: String(campaign.id),
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
      default:
        return renderOverview();
    }
  }

  if (!sessionChecked || loading) {
    return <div className="admin-loading">Loading admin dashboard...</div>;
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
                if (tab.key !== 'ads') {
                  setAdsStatusFilter('all');
                }
                setActiveTab(tab.key);
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button className="admin-btn secondary admin-refresh-btn" onClick={loadAll}>
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