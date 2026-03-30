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

function CreatorWalletPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadWallet() {
    try {
      setLoading(true);
      setErrorMessage('');

      const response = await walletService.getMyWallet();

      setWallet(response?.wallet || null);
      setTransactions(Array.isArray(response?.transactions) ? response.transactions : []);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
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
        sub: 'Latest history',
      },
    ];
  }, [wallet, transactions]);

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
      await loadWallet();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to top up wallet');
    } finally {
      setSubmitting(false);
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

        {errorMessage ? (
          <div className="watch-inline-message error">{errorMessage}</div>
        ) : null}

        {pageMessage ? (
          <div className="watch-inline-message success">{pageMessage}</div>
        ) : null}

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

          {loading ? (
            <div className="dashboard-empty-box">Loading wallet...</div>
          ) : transactions.length ? (
            <div className="videogad-video-table">
              {transactions.map((item) => (
                <div className="videogad-video-row" key={item.id}>
                  <div className="video-main">
                    <div className="video-thumb-placeholder">
                      {item.direction === 'credit' ? 'CR' : 'DR'}
                    </div>

                    <div>
                      <h4>{formatType(item.type)}</h4>
                      <p>{item.description || item.reference || 'Wallet transaction'}</p>
                    </div>
                  </div>

                  <div className="video-meta">
                    <span className={`status-badge ${getTypeClass(item.type, item.direction)}`}>
                      {item.direction === 'credit' ? 'Credit' : 'Debit'}
                    </span>
                    <span>{formatMoney(item.amount)}</span>
                    <span>Before: {formatMoney(item.balance_before)}</span>
                    <span>After: {formatMoney(item.balance_after)}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-box">No wallet transactions yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CreatorWalletPage;