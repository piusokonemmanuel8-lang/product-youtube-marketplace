import React, { useEffect, useMemo, useState } from 'react';
import './AdminDashboardApp.css';
import adminService from '../services/adminService';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'videos', label: 'Videos' },
  { key: 'moderation', label: 'Moderation Queue' },
  { key: 'reports', label: 'Reports' },
  { key: 'categories', label: 'Categories' },
  { key: 'plans', label: 'External Plans' },
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

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [me, setMe] = useState(null);
  const [videos, setVideos] = useState([]);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [payoutTransactions, setPayoutTransactions] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState({});
  const [analyticsOverview, setAnalyticsOverview] = useState({});

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const [
        meData,
        videosData,
        queueData,
        reportsData,
        categoriesData,
        treeData,
        plansData,
        payoutRequestsData,
        payoutTransactionsData,
        dashboardData,
        analyticsData,
      ] = await Promise.all([
        adminService.getMe(),
        adminService.getVideos(),
        adminService.getModerationQueue().catch(() => []),
        adminService.getReports().catch(() => []),
        adminService.getCategories().catch(() => []),
        adminService.getCategoryTree().catch(() => []),
        adminService.getExternalPostingPlans().catch(() => []),
        adminService.getCreatorPayoutRequests().catch(() => []),
        adminService.getPayoutTransactions().catch(() => []),
        adminService.getDashboardSummary().catch(() => ({})),
        adminService.getAnalyticsOverview().catch(() => ({})),
      ]);

      setMe(meData);
      setVideos(videosData);
      setModerationQueue(queueData);
      setReports(reportsData);
      setCategories(categoriesData);
      setCategoryTree(treeData);
      setPlans(plansData);
      setPayoutRequests(payoutRequestsData);
      setPayoutTransactions(payoutTransactionsData);
      setDashboardSummary(dashboardData || {});
      setAnalyticsOverview(analyticsData || {});
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  }

  const filteredVideos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return videos;

    return videos.filter((video) => {
      return (
        String(video.title || '').toLowerCase().includes(term) ||
        String(video.creator_name || '').toLowerCase().includes(term) ||
        String(video.channel_name || '').toLowerCase().includes(term) ||
        String(video.status || '').toLowerCase().includes(term) ||
        String(video.moderation_status || '').toLowerCase().includes(term)
      );
    });
  }, [videos, searchTerm]);

  const overviewCards = useMemo(() => {
    const approvedVideos = videos.filter(
      (video) => String(video.moderation_status).toLowerCase() === 'approved'
    ).length;

    const pendingVideos = videos.filter(
      (video) => String(video.moderation_status).toLowerCase() === 'pending'
    ).length;

    const rejectedVideos = videos.filter(
      (video) => String(video.moderation_status).toLowerCase() === 'rejected'
    ).length;

    const pendingReports = reports.filter(
      (report) => String(report.status).toLowerCase() === 'pending'
    ).length;

    return [
      { label: 'Total Videos', value: videos.length },
      { label: 'Approved Videos', value: approvedVideos },
      { label: 'Pending Videos', value: pendingVideos },
      { label: 'Rejected Videos', value: rejectedVideos },
      { label: 'Moderation Queue', value: moderationQueue.length },
      { label: 'Pending Reports', value: pendingReports },
      { label: 'Categories', value: categories.length },
      { label: 'External Plans', value: plans.length },
    ];
  }, [videos, moderationQueue, reports, categories, plans]);

  async function handleApprove(item) {
    const actionId = `approve-${item.id}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.approveVideo(item.id);
      setSuccessMessage('Video approved');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Approval failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleReject(item) {
    const reviewerNote = window.prompt('Reason for rejection (optional):', '') || '';
    const actionId = `reject-${item.id}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.rejectVideo(item.id, reviewerNote);
      setSuccessMessage('Video rejected');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Rejection failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleQueueApprove(queueItem) {
    const actionId = `queue-approve-${queueItem.id}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.reviewModeration(queueItem.id, 'approve');
      setSuccessMessage('Queue item approved');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Queue approval failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleQueueReject(queueItem) {
    const reviewerNote = window.prompt('Reason for rejection (optional):', '') || '';
    const actionId = `queue-reject-${queueItem.id}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.reviewModeration(queueItem.id, 'reject', reviewerNote);
      setSuccessMessage('Queue item rejected');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Queue rejection failed');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleDeleteVideo(video) {
    const confirmed = window.confirm(`Delete "${video.title}"?`);
    if (!confirmed) return;

    const actionId = `delete-${video.id}`;
    setActionLoadingId(actionId);
    setError('');
    setSuccessMessage('');

    try {
      await adminService.deleteVideo(video.id);
      setSuccessMessage('Video deleted');
      await loadAll();
    } catch (err) {
      setError(err.message || 'Delete failed');
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
              <div><span>Name:</span> {me?.full_name || me?.name || '—'}</div>
              <div><span>Email:</span> {me?.email || '—'}</div>
              <div><span>Status:</span> {me?.status || '—'}</div>
              <div><span>Roles:</span> {Array.isArray(me?.roles) ? me.roles.join(', ') : '—'}</div>
            </div>
          </div>

          <div className="admin-panel">
            <h3>Dashboard Summary</h3>
            <pre className="admin-json-block">
              {JSON.stringify(dashboardSummary || {}, null, 2)}
            </pre>
          </div>

          <div className="admin-panel">
            <h3>Analytics Overview</h3>
            <pre className="admin-json-block">
              {JSON.stringify(analyticsOverview || {}, null, 2)}
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
            placeholder="Search videos, creators, channels, status..."
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
                  <td colSpan="8" className="admin-empty">
                    No videos found
                  </td>
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
                    <td>{video.creator_name}</td>
                    <td>{video.channel_name}</td>
                    <td>
                      <span className={`admin-badge ${String(video.status).toLowerCase()}`}>
                        {video.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${String(video.moderation_status).toLowerCase()}`}
                      >
                        {video.moderation_status}
                      </span>
                    </td>
                    <td>{formatCount(video.views_count)}</td>
                    <td>{formatDate(video.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-btn success"
                          disabled={actionLoadingId === `approve-${video.id}`}
                          onClick={() => handleApprove(video)}
                        >
                          Approve
                        </button>
                        <button
                          className="admin-btn warning"
                          disabled={actionLoadingId === `reject-${video.id}`}
                          onClick={() => handleReject(video)}
                        >
                          Reject
                        </button>
                        <button
                          className="admin-btn danger"
                          disabled={actionLoadingId === `delete-${video.id}`}
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
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Queue ID</th>
                <th>Video</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {moderationQueue.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    No moderation items
                  </td>
                </tr>
              ) : (
                moderationQueue.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      <div className="admin-strong">{item.video?.title || 'Untitled'}</div>
                      <div className="admin-subtext">
                        {item.video?.creator_name || 'Unknown creator'}
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${String(item.queue_status).toLowerCase()}`}>
                        {item.queue_status}
                      </span>
                    </td>
                    <td>{item.reason || '—'}</td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-btn success"
                          disabled={actionLoadingId === `queue-approve-${item.id}`}
                          onClick={() => handleQueueApprove(item)}
                        >
                          Approve
                        </button>
                        <button
                          className="admin-btn warning"
                          disabled={actionLoadingId === `queue-reject-${item.id}`}
                          onClick={() => handleQueueReject(item)}
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

  function renderReports() {
    return (
      <div className="admin-section">
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
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="admin-empty">
                    No reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.id}</td>
                    <td>{report.video_title}</td>
                    <td>{report.reason}</td>
                    <td>{report.reported_by}</td>
                    <td>
                      <span className={`admin-badge ${String(report.status).toLowerCase()}`}>
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
            <h3>Flat Categories</h3>
            {categories.length === 0 ? (
              <p className="admin-muted">No categories found</p>
            ) : (
              <div className="admin-chip-wrap">
                {categories.map((category, index) => (
                  <span className="admin-chip" key={category.id || index}>
                    {category.name || category.title || category.slug || `Category ${index + 1}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="admin-panel">
            <h3>Category Tree</h3>
            <pre className="admin-json-block">
              {JSON.stringify(categoryTree || [], null, 2)}
            </pre>
          </div>
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
                  <td colSpan="5" className="admin-empty">
                    No external posting plans found
                  </td>
                </tr>
              ) : (
                plans.map((plan, index) => (
                  <tr key={plan.id || index}>
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

  function renderPayouts() {
    return (
      <div className="admin-section">
        <div className="admin-panels-grid">
          <div className="admin-panel">
            <h3>Payout Requests</h3>
            <pre className="admin-json-block">
              {JSON.stringify(payoutRequests || [], null, 2)}
            </pre>
          </div>

          <div className="admin-panel">
            <h3>Payout Transactions</h3>
            <pre className="admin-json-block">
              {JSON.stringify(payoutTransactions || [], null, 2)}
            </pre>
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
      case 'reports':
        return renderReports();
      case 'categories':
        return renderCategories();
      case 'plans':
        return renderPlans();
      case 'payouts':
        return renderPayouts();
      default:
        return renderOverview();
    }
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
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button className="admin-btn secondary admin-refresh-btn" onClick={loadAll}>
          Reload data
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

        {loading ? (
          <div className="admin-loading">Loading admin dashboard...</div>
        ) : (
          renderTabContent()
        )}
      </main>
    </div>
  );
}

export default AdminDashboardPage;