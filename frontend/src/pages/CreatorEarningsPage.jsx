import React, { useEffect, useMemo, useState } from 'react';
import {
  getCreatorPayoutRequests,
  getCreatorPayoutTransactions,
} from '../services/creatorEarningsService';

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.payouts)) return data.payouts;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.payoutRequests)) return data.payoutRequests;
  return [];
}

function getDemoTransactions() {
  return [
    {
      id: 1,
      title: 'Video sales revenue',
      amount: '₦120,000',
      status: 'Completed',
      date: '2026-03-20',
      type: 'Revenue',
    },
    {
      id: 2,
      title: 'Marketplace referral earnings',
      amount: '₦45,500',
      status: 'Completed',
      date: '2026-03-18',
      type: 'Referral',
    },
    {
      id: 3,
      title: 'Creator ad share',
      amount: '₦18,000',
      status: 'Pending',
      date: '2026-03-15',
      type: 'Ad Revenue',
    },
  ];
}

function getDemoRequests() {
  return [
    {
      id: 11,
      amount: '₦80,000',
      status: 'Pending',
      created_at: '2026-03-22',
      method: 'Bank Transfer',
    },
    {
      id: 12,
      amount: '₦50,000',
      status: 'Approved',
      created_at: '2026-03-10',
      method: 'Bank Transfer',
    },
    {
      id: 13,
      amount: '₦35,000',
      status: 'Paid',
      created_at: '2026-03-03',
      method: 'Crypto Wallet',
    },
  ];
}

function CreatorEarningsPage() {
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    async function loadEarnings() {
      setLoading(true);
      setErrorMessage('');
      setPageMessage('');

      try {
        const [transactionsResponse, requestsResponse] = await Promise.all([
          getCreatorPayoutTransactions().catch(() => null),
          getCreatorPayoutRequests().catch(() => null),
        ]);

        const tx = normalizeArrayResponse(transactionsResponse);
        const rq = normalizeArrayResponse(requestsResponse);

        if (!tx.length && !rq.length) {
          throw new Error('No earnings data available yet');
        }

        setTransactions(tx);
        setRequests(rq);
        setIsDemoMode(false);
      } catch (error) {
        setTransactions(getDemoTransactions());
        setRequests(getDemoRequests());
        setIsDemoMode(true);
        setPageMessage('Demo mode is showing because earnings data is not available yet.');
        setErrorMessage('');
      } finally {
        setLoading(false);
      }
    }

    loadEarnings();
  }, []);

  const summary = useMemo(() => {
    return {
      totalRevenue: transactions.length ? transactions.length : 3,
      totalRequests: requests.length,
      pendingRequests: requests.filter((item) => String(item.status).toLowerCase() === 'pending').length,
      completedTransactions: transactions.filter((item) => String(item.status).toLowerCase() === 'completed').length,
    };
  }, [transactions, requests]);

  if (loading) {
    return (
      <div className="earnings-loading-page">
        <div className="earnings-loading-card">Loading creator earnings...</div>
      </div>
    );
  }

  return (
    <div className="creator-earnings-page">
      <div className="creator-earnings-shell">
        {errorMessage ? (
          <div className="earnings-inline-message error">{errorMessage}</div>
        ) : null}

        {pageMessage ? (
          <div className="earnings-inline-message success">{pageMessage}</div>
        ) : null}

        <section className="creator-earnings-header">
          <div>
            <p className="eyebrow">Creator Studio</p>
            <h1>Earnings</h1>
            <span>
              Track revenue flow, transaction history, and payout request activity.
            </span>
          </div>

          <div className="creator-earnings-header-actions">
            <a href="/creator-dashboard" className="ghost-btn">Dashboard</a>
            <a href="/creator-payout" className="primary-btn">Go to Payout</a>
          </div>
        </section>

        <section className="creator-earnings-stats">
          <div className="creator-earnings-stat-card">
            <p>Revenue Records</p>
            <h3>{summary.totalRevenue}</h3>
            <span>Transactions available</span>
          </div>

          <div className="creator-earnings-stat-card">
            <p>Payout Requests</p>
            <h3>{summary.totalRequests}</h3>
            <span>Request history</span>
          </div>

          <div className="creator-earnings-stat-card">
            <p>Pending Requests</p>
            <h3>{summary.pendingRequests}</h3>
            <span>Awaiting processing</span>
          </div>

          <div className="creator-earnings-stat-card">
            <p>Completed Entries</p>
            <h3>{summary.completedTransactions}</h3>
            <span>Settled earnings</span>
          </div>
        </section>

        <section className="creator-earnings-grid">
          <div className="creator-earnings-card">
            <div className="creator-earnings-card-head">
              <h2>Payout Transactions</h2>
            </div>

            <div className="creator-earnings-table">
              <div className="creator-earnings-table-head">
                <span>Title</span>
                <span>Type</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {transactions.length ? (
                transactions.map((item, index) => (
                  <div className="creator-earnings-table-row" key={item.id || index}>
                    <span>{item.title || item.description || `Transaction ${index + 1}`}</span>
                    <span>{item.type || item.category || 'Revenue'}</span>
                    <span>{item.amount || item.total || '—'}</span>
                    <span className={`earnings-status ${String(item.status || 'pending').toLowerCase()}`}>
                      {item.status || 'Pending'}
                    </span>
                    <span>{item.date || item.created_at || '—'}</span>
                  </div>
                ))
              ) : (
                <div className="creator-earnings-empty">No transactions returned yet.</div>
              )}
            </div>
          </div>

          <div className="creator-earnings-card">
            <div className="creator-earnings-card-head">
              <h2>Payout Requests</h2>
            </div>

            <div className="creator-earnings-table">
              <div className="creator-earnings-table-head request-grid">
                <span>Amount</span>
                <span>Method</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {requests.length ? (
                requests.map((item, index) => (
                  <div className="creator-earnings-table-row request-grid" key={item.id || index}>
                    <span>{item.amount || item.total || '—'}</span>
                    <span>{item.method || item.payout_method || '—'}</span>
                    <span className={`earnings-status ${String(item.status || 'pending').toLowerCase()}`}>
                      {item.status || 'Pending'}
                    </span>
                    <span>{item.created_at || item.date || '—'}</span>
                  </div>
                ))
              ) : (
                <div className="creator-earnings-empty">No payout requests returned yet.</div>
              )}
            </div>
          </div>
        </section>

        {isDemoMode ? (
          <div className="creator-earnings-note">
            Some earnings values are demo placeholders because backend payout records are not yet available.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default CreatorEarningsPage;