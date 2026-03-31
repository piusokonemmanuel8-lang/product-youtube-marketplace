import React, { useEffect, useMemo, useState } from 'react';
import '../creator-dashboard.css';
import {
  createSupportConversation,
  getMySupportConversation,
  getMySupportConversations,
  markSupportConversationRead,
  sendSupportMessage,
} from '../services/creatorDashboardService';

function formatDateLabel(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}

function normalizeConversationList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeConversationDetail(data) {
  if (data?.conversation || data?.messages) {
    return {
      conversation: data?.conversation || null,
      messages: Array.isArray(data?.messages) ? data.messages : [],
    };
  }

  if (data?.data?.conversation || data?.data?.messages) {
    return {
      conversation: data?.data?.conversation || null,
      messages: Array.isArray(data?.data?.messages) ? data.data.messages : [],
    };
  }

  return {
    conversation: null,
    messages: [],
  };
}

function getConversationStatusClass(status) {
  return String(status || 'open').toLowerCase().replace(/\s+/g, '-');
}

function CreatorSupportPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [newConversationForm, setNewConversationForm] = useState({
    subject: '',
    message_text: '',
  });

  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations(preferredConversationId = null) {
    setLoadingList(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await getMySupportConversations();
      const items = normalizeConversationList(response);
      setConversations(items);

      const nextConversationId =
        preferredConversationId ||
        selectedConversationId ||
        items?.[0]?.id ||
        null;

      if (nextConversationId) {
        await loadConversation(nextConversationId);
      } else {
        setSelectedConversationId(null);
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load support conversations.');
    } finally {
      setLoadingList(false);
    }
  }

  async function loadConversation(conversationId) {
    if (!conversationId) return;

    setLoadingConversation(true);
    setError('');

    try {
      const response = await getMySupportConversation(conversationId);
      const detail = normalizeConversationDetail(response);

      setSelectedConversationId(Number(conversationId));
      setSelectedConversation(detail.conversation || null);
      setMessages(detail.messages || []);

      await markSupportConversationRead(conversationId).catch(() => null);

      setConversations((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(conversationId)
            ? { ...item, unread_count: 0 }
            : item
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to load this conversation.');
    } finally {
      setLoadingConversation(false);
    }
  }

  async function handleCreateConversation(event) {
    event.preventDefault();

    const subject = String(newConversationForm.subject || '').trim();
    const messageText = String(newConversationForm.message_text || '').trim();

    if (!subject || !messageText) {
      setError('Subject and first message are required.');
      return;
    }

    setCreatingConversation(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await createSupportConversation({
        subject,
        message_text: messageText,
      });

      const detail = normalizeConversationDetail(response);
      const newConversationId = detail?.conversation?.id || null;

      setNewConversationForm({
        subject: '',
        message_text: '',
      });

      setSuccessMessage('Support conversation created successfully.');

      if (newConversationId) {
        await loadConversations(newConversationId);
      } else {
        await loadConversations();
      }
    } catch (err) {
      setError(err.message || 'Failed to create support conversation.');
    } finally {
      setCreatingConversation(false);
    }
  }

  async function handleSendReply(event) {
    event.preventDefault();

    if (!selectedConversationId) {
      setError('Select a conversation first.');
      return;
    }

    const messageText = String(replyMessage || '').trim();

    if (!messageText) {
      setError('Reply message is required.');
      return;
    }

    setSendingMessage(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await sendSupportMessage(selectedConversationId, {
        message_text: messageText,
      });

      const detail = normalizeConversationDetail(response);

      setReplyMessage('');
      setSelectedConversation(detail.conversation || selectedConversation);
      setMessages(detail.messages || []);
      setSuccessMessage('Message sent successfully.');

      setConversations((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(selectedConversationId)
            ? {
                ...item,
                status: detail?.conversation?.status || item.status,
                last_message_at:
                  detail?.conversation?.last_message_at || new Date().toISOString(),
                last_message_text: messageText,
              }
            : item
        )
      );

      await loadConversations(selectedConversationId);
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('videogad_token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = new Date(a?.last_message_at || a?.updated_at || a?.created_at || 0).getTime();
      const bTime = new Date(b?.last_message_at || b?.updated_at || b?.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [conversations]);

  return (
    <div className="videogad-dashboard-page">
      <aside className={`videogad-dashboard-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="videogad-sidebar-top">
          <div className="videogad-brand">VideoGad</div>

          <button
            className="videogad-close-menu"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            ✕
          </button>
        </div>

        <nav className="videogad-dashboard-nav">
          <a href="/creator-dashboard">Dashboard</a>
          <a href="/create-channel">Edit Channel</a>
          <a href="/upload-video">Upload Video</a>
          <a href="/my-videos">My Videos</a>
          <a href="/creator-analytics">Analytics</a>
          <a href="/creator-support" className="active">Support Chat</a>
          <a href="/creator-ads">Ads</a>
          <a href="/creator-ads-analytics">Ads Analytics</a>
          <a href="/creator-wallet">Wallet</a>
          <a href="/creator-earnings">Earnings</a>
          <a href="/creator-payout">Payout</a>
          <a href="/creator-subscription">Subscription</a>
          <a href="/account-settings">Settings</a>

          <button
            type="button"
            className="dashboard-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="videogad-dashboard-main">
        <header className="videogad-dashboard-header">
          <div className="videogad-mobile-topbar">
            <button
              className="videogad-menu-toggle"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              ☰
            </button>
            <div className="videogad-mobile-brand">VideoGad</div>
          </div>

          <div className="videogad-header-main">
            <div>
              <p className="eyebrow">Creator Studio</p>
              <h1>Support Chat</h1>
              <span>Contact admin for help, questions and marketplace support.</span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => loadConversations(selectedConversationId)}
              >
                Refresh
              </button>
              <a href="/creator-dashboard" className="ghost-btn">Back to Dashboard</a>
            </div>
          </div>
        </header>

        {error ? (
          <div className="admin-alert error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="admin-alert success" style={{ marginBottom: 16 }}>
            {successMessage}
          </div>
        ) : null}

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel">
            <div className="panel-head">
              <h2>New Conversation</h2>
            </div>

            <form className="admin-form" onSubmit={handleCreateConversation}>
              <input
                className="admin-input"
                type="text"
                placeholder="Subject"
                value={newConversationForm.subject}
                onChange={(e) =>
                  setNewConversationForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
              />

              <textarea
                className="admin-input admin-textarea"
                placeholder="Write your first message to admin..."
                value={newConversationForm.message_text}
                onChange={(e) =>
                  setNewConversationForm((prev) => ({
                    ...prev,
                    message_text: e.target.value,
                  }))
                }
                rows={5}
              />

              <div className="admin-actions">
                <button
                  type="submit"
                  className="admin-btn success"
                  disabled={creatingConversation}
                >
                  {creatingConversation ? 'Creating...' : 'Start Conversation'}
                </button>
              </div>
            </form>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>My Conversations</h2>
            </div>

            {loadingList ? (
              <div className="dashboard-empty-box">Loading conversations...</div>
            ) : sortedConversations.length === 0 ? (
              <div className="dashboard-empty-box">No support conversations yet.</div>
            ) : (
              <div className="videogad-video-table">
                {sortedConversations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadConversation(item.id)}
                    className="videogad-video-row"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background:
                        Number(selectedConversationId) === Number(item.id)
                          ? 'rgba(255,255,255,0.05)'
                          : undefined,
                      border:
                        Number(selectedConversationId) === Number(item.id)
                          ? '1px solid rgba(255,255,255,0.14)'
                          : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="video-main">
                      <div>
                        <h4>{item.subject || `Conversation #${item.id}`}</h4>
                        <p>{item.last_message_text || 'No message preview yet.'}</p>
                        <p>{formatDateLabel(item.last_message_at || item.created_at)}</p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span className={`status-badge ${getConversationStatusClass(item.status)}`}>
                        {item.status || 'open'}
                      </span>
                      {Number(item.unread_count || 0) > 0 ? (
                        <span>{item.unread_count} unread</span>
                      ) : (
                        <span>Read</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel large">
            <div className="panel-head">
              <h2>
                {selectedConversation
                  ? selectedConversation.subject || `Conversation #${selectedConversation.id}`
                  : 'Conversation Messages'}
              </h2>
            </div>

            {!selectedConversationId ? (
              <div className="dashboard-empty-box">
                Select a conversation to view messages.
              </div>
            ) : loadingConversation ? (
              <div className="dashboard-empty-box">Loading messages...</div>
            ) : (
              <>
                <div className="marketplace-status-box" style={{ marginBottom: 18 }}>
                  <div className="marketplace-row">
                    <span>Status</span>
                    <strong>{selectedConversation?.status || 'open'}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Created</span>
                    <strong>{formatDateLabel(selectedConversation?.created_at)}</strong>
                  </div>
                  <div className="marketplace-row">
                    <span>Last Updated</span>
                    <strong>
                      {formatDateLabel(
                        selectedConversation?.last_message_at || selectedConversation?.updated_at
                      )}
                    </strong>
                  </div>
                </div>

                <div className="videogad-video-table">
                  {messages.length === 0 ? (
                    <div className="dashboard-empty-box">No messages yet.</div>
                  ) : (
                    messages.map((message) => {
                      const isAdmin = String(message?.sender_role || '').toLowerCase() === 'admin';

                      return (
                        <div
                          key={message.id}
                          className="videogad-video-row"
                          style={{
                            borderLeft: isAdmin
                              ? '4px solid rgba(255, 89, 149, 0.9)'
                              : '4px solid rgba(94, 234, 212, 0.9)',
                          }}
                        >
                          <div className="video-main">
                            <div>
                              <h4>{isAdmin ? 'Admin' : 'You'}</h4>
                              <p style={{ whiteSpace: 'pre-wrap' }}>
                                {message?.message_text || ''}
                              </p>
                              <p>{formatDateLabel(message?.created_at)}</p>
                            </div>
                          </div>

                          <div className="video-meta">
                            <span className={`status-badge ${getConversationStatusClass(message?.sender_role)}`}>
                              {message?.sender_role || 'user'}
                            </span>
                            <span>{Number(message?.is_read) === 1 ? 'Read' : 'Unread'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form className="admin-form" onSubmit={handleSendReply} style={{ marginTop: 18 }}>
                  <textarea
                    className="admin-input admin-textarea"
                    placeholder="Write your reply to admin..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={4}
                  />

                  <div className="admin-actions">
                    <button
                      type="submit"
                      className="admin-btn success"
                      disabled={sendingMessage}
                    >
                      {sendingMessage ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Support Guide</h2>
            </div>

            <div className="marketplace-status-box">
              <div className="marketplace-row">
                <span>Create conversation</span>
                <strong>Ready</strong>
              </div>
              <div className="marketplace-row">
                <span>List my conversations</span>
                <strong>Ready</strong>
              </div>
              <div className="marketplace-row">
                <span>Open messages</span>
                <strong>Ready</strong>
              </div>
              <div className="marketplace-row">
                <span>Reply to admin</span>
                <strong>Ready</strong>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CreatorSupportPage;