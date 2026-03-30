import React, { useEffect, useMemo, useState } from 'react';
import '../creator-dashboard.css';
import walletService from '../services/walletService';

function formatMoney(value) {
  const number = Number(value || 0);
  return `$${number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatType(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTypeClass(type, direction) {
  if (direction === 'credit') return 'published';
  if (direction === 'debit') return 'rejected';
  if (type === 'topup') return 'published';
  if (type === 'ad_spend') return 'rejected';
  return 'draft';
}

function toInputDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDefaultRange() {
  const now = new Date();
  const toDate = toInputDate(now);

  const from = new Date(now);
  from.setDate(from.getDate() - 6);

  return {
    fromDate: toInputDate(from),
    toDate,
  };
}

function getDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function CreatorWalletPage() {
  const defaultRange = getDefaultRange();

  const [menuOpen, setMenuOpen] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});
  const [amount, setAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadWallet(filters = {}, keepSelected = false) {
    try {
      const usingCustomLoad = Boolean(filters.fromDate || filters.toDate);

      if (usingCustomLoad) {
        setFilterLoading(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

      const response = await walletService.getMyWallet(filters);
      const nextTransactions = Array.isArray(response?.transactions) ? response.transactions : [];

      setWallet(response?.wallet || null);
      setTransactions(nextTransactions);

      const nextExpandedDates = {};
      nextTransactions.forEach((item) => {
        const key = getDateKey(item.created_at);
        if (!(key in nextExpandedDates)) {
          nextExpandedDates[key] = false;
        }
      });
      setExpandedDates(nextExpandedDates);

      if (!keepSelected) {
        setSelectedTransaction(null);
      } else if (selectedTransaction?.id) {
        const updatedSelected = nextTransactions.find(
          (item) => Number(item.id) === Number(selectedTransaction.id)
        );
        setSelectedTransaction(updatedSelected || null);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  }

  useEffect(() => {
    loadWallet({
      fromDate: defaultRange.fromDate,
      toDate: defaultRange.toDate,
    });
  }, []);

  const summaryCards = useMemo(() => {
    return [
      {
        label: 'Current Balance',
        value: formatMoney(wallet?.balance || 0),
        sub: 'Available for ads',
      },
      {
        label: 'Total Funded',
        value: formatMoney(wallet?.total_funded || 0),
        sub: 'All wallet topups',
      },
      {
        label: 'Total Spent',
        value: formatMoney(wallet?.total_spent || 0),
        sub: 'Ad deductions',
      },
      {
        label: 'Transactions',
        value: String(transactions.length || 0),
        sub: 'Last 7 days by default',
      },
    ];
  }, [wallet, transactions]);

  const groupedTransactions = useMemo(() => {
    const groups = [];

    transactions.forEach((item) => {
      const dateKey = getDateKey(item.created_at);
      const label = formatDate(item.created_at);

      const existing = groups.find((group) => group.dateKey === dateKey);

      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({
          dateKey,
          label,
          items: [item],
        });
      }
    });

    return groups;
  }, [transactions]);

  async function handleTopupSubmit(event) {
    event.preventDefault();

    const numericAmount = Number(amount || 0);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      setPageMessage('');

      await walletService.topUpWallet(numericAmount, paymentReference);

      setAmount('');
      setPaymentReference('');
      setPageMessage('Wallet topped up successfully.');
      await loadWallet({ fromDate, toDate }, true);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to top up wallet');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFilterSubmit(event) {
    event.preventDefault();

    if (!fromDate || !toDate) {
      setErrorMessage('Select both from date and to date');
      return;
    }

    if (new Date(fromDate).getTime() > new Date(toDate).getTime()) {
      setErrorMessage('From date cannot be greater than to date');
      return;
    }

    setPageMessage('');
    setSelectedTransaction(null);
    await loadWallet({ fromDate, toDate });
  }

  async function handleQuickLast7Days() {
    const range = getDefaultRange();
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setPageMessage('');
    setSelectedTransaction(null);
    await loadWallet(range);
  }

  function toggleDateGroup(dateKey) {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  }

  async function handleSelectTransaction(transactionId) {
    try {
      setDetailsLoading(true);
      setErrorMessage('');

      const response = await walletService.getWalletTransactionById(transactionId);
      setSelectedTransaction(response?.transaction || null);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load transaction details');
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleDeleteTransaction(transactionId) {
    const confirmed = window.confirm('Delete this transaction history item?');

    if (!confirmed) return;

    try {
      setDeletingId(transactionId);
      setErrorMessage('');
      setPageMessage('');

      await walletService.deleteWalletTransaction(transactionId);

      const remainingTransactions = transactions.filter(
        (item) => Number(item.id) !== Number(transactionId)
      );

      setTransactions(remainingTransactions);

      if (Number(selectedTransaction?.id) === Number(transactionId)) {
        setSelectedTransaction(null);
      }

      setPageMessage('Transaction deleted successfully.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('videogad_token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

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
          <a href="/creator-ads">Ads</a>
          <a href="/creator-ads-analytics">Ads Analytics</a>
          <a href="/creator-wallet" className="active">Wallet</a>
          <a href="/creator-earnings">Earnings</a>
          <a href="/creator-payout">Payout</a>
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
              <h1>Wallet</h1>
              <span>Top up wallet and track every ad spend deduction.</span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <a href="/creator-ads" className="ghost-btn">Manage Ads</a>
              <a href="/creator-ads-analytics" className="ghost-btn">Ads Analytics</a>
            </div>
          </div>
        </header>

        {errorMessage ? <div className="watch-inline-message error">{errorMessage}</div> : null}
        {pageMessage ? <div className="watch-inline-message success">{pageMessage}</div> : null}

        <section className="videogad-stats-grid">
          {summaryCards.map((item) => (
            <div className="videogad-stat-card" key={item.label}>
              <p>{item.label}</p>
              <h3>{item.value}</h3>
              <span>{item.sub}</span>
            </div>
          ))}
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Top Up Wallet</h2>
            </div>

            <form className="marketplace-auth-form" onSubmit={handleTopupSubmit}>
              <div className="marketplace-auth-grid">
                <div className="marketplace-auth-field">
                  <label>Amount</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="marketplace-auth-field">
                  <label>Payment Reference</label>
                  <input
                    type="text"
                    placeholder="Optional payment reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
              </div>

              <div className="marketplace-auth-actions">
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Top Up Wallet'}
                </button>
              </div>
            </form>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Wallet Summary</h2>
            </div>

            <div className="marketplace-status-box">
              <div className="marketplace-row">
                <span>Status</span>
                <strong>{wallet?.status || 'active'}</strong>
              </div>

              <div className="marketplace-row">
                <span>Balance</span>
                <strong>{formatMoney(wallet?.balance || 0)}</strong>
              </div>

              <div className="marketplace-row">
                <span>Total Funded</span>
                <strong>{formatMoney(wallet?.total_funded || 0)}</strong>
              </div>

              <div className="marketplace-row">
                <span>Total Spent</span>
                <strong>{formatMoney(wallet?.total_spent || 0)}</strong>
              </div>

              <div className="marketplace-row">
                <span>Created</span>
                <strong>{formatDate(wallet?.created_at)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="videogad-panel large">
          <div className="panel-head">
            <h2>Wallet Transactions</h2>
            <span>{transactions.length} records</span>
          </div>

          <form className="marketplace-auth-form" onSubmit={handleFilterSubmit} style={{ marginBottom: '18px' }}>
            <div className="marketplace-auth-grid">
              <div className="marketplace-auth-field">
                <label>From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="marketplace-auth-field">
                <label>To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            <div className="marketplace-auth-actions">
              <button type="submit" className="primary-btn" disabled={filterLoading}>
                {filterLoading ? 'Filtering...' : 'Apply Filter'}
              </button>

              <button
                type="button"
                className="ghost-btn"
                onClick={handleQuickLast7Days}
                disabled={filterLoading}
              >
                Last 7 Days
              </button>
            </div>
          </form>

          {loading ? (
            <div className="dashboard-empty-box">Loading wallet...</div>
          ) : (
            <div className="videogad-dashboard-content-grid">
              <div className="videogad-panel" style={{ margin: 0 }}>
                <div className="panel-head">
                  <h2>Transactions By Date</h2>
                  <span>Click date to expand</span>
                </div>

                {groupedTransactions.length ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {groupedTransactions.map((group) => {
                      const isOpen = Boolean(expandedDates[group.dateKey]);

                      return (
                        <div
                          key={group.dateKey}
                          style={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            background: 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleDateGroup(group.dateKey)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '14px 16px',
                              background: 'transparent',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              fontWeight: 700,
                              textAlign: 'left',
                            }}
                          >
                            <span>{group.label}</span>
                            <span>
                              {group.items.length} {group.items.length === 1 ? 'transaction' : 'transactions'} {isOpen ? '▲' : '▼'}
                            </span>
                          </button>

                          {isOpen ? (
                            <div style={{ padding: '0 12px 12px' }}>
                              {group.items.map((item) => (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px',
                                    marginTop: '8px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSelectTransaction(item.id)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'inherit',
                                      cursor: 'pointer',
                                      flex: '1 1 420px',
                                      textAlign: 'left',
                                      padding: 0,
                                    }}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <strong>{formatType(item.type)}</strong>
                                      <span>{item.description || item.reference || 'Wallet transaction'}</span>
                                      <span>{formatDateTime(item.created_at)}</span>
                                    </div>
                                  </button>

                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      flexWrap: 'wrap',
                                      justifyContent: 'flex-end',
                                    }}
                                  >
                                    <span className={`status-badge ${getTypeClass(item.type, item.direction)}`}>
                                      {item.direction === 'credit' ? 'Credit' : 'Debit'}
                                    </span>

                                    <strong>{formatMoney(item.amount)}</strong>

                                    <button
                                      type="button"
                                      className="ghost-btn"
                                      onClick={() => handleDeleteTransaction(item.id)}
                                      disabled={deletingId === item.id}
                                    >
                                      {deletingId === item.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="dashboard-empty-box">No wallet transactions found for this date range.</div>
                )}
              </div>

              <div className="videogad-panel" style={{ margin: 0 }}>
                <div className="panel-head">
                  <h2>Transaction Details</h2>
                  <span>
                    {detailsLoading
                      ? 'Loading...'
                      : selectedTransaction
                        ? `#${selectedTransaction.id}`
                        : 'No selection'}
                  </span>
                </div>

                {detailsLoading ? (
                  <div className="dashboard-empty-box">Loading transaction details...</div>
                ) : selectedTransaction ? (
                  <div className="marketplace-status-box">
                    <div className="marketplace-row">
                      <span>Type</span>
                      <strong>{formatType(selectedTransaction.type)}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Direction</span>
                      <strong>{selectedTransaction.direction === 'credit' ? 'Credit' : 'Debit'}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Amount</span>
                      <strong>{formatMoney(selectedTransaction.amount)}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Balance Before</span>
                      <strong>{formatMoney(selectedTransaction.balance_before)}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Balance After</span>
                      <strong>{formatMoney(selectedTransaction.balance_after)}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Reference</span>
                      <strong>{selectedTransaction.reference || '—'}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Description</span>
                      <strong>{selectedTransaction.description || 'Wallet transaction'}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Date</span>
                      <strong>{formatDateTime(selectedTransaction.created_at)}</strong>
                    </div>

                    <div className="marketplace-row" style={{ alignItems: 'flex-start' }}>
                      <span>Metadata</span>
                      <strong style={{ textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
                        {selectedTransaction.metadata
                          ? JSON.stringify(selectedTransaction.metadata)
                          : '—'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="dashboard-empty-box">
                    Click a transaction inside any date group to see full breakdown.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CreatorWalletPage;