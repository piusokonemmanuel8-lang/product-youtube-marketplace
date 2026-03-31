import React, { useEffect, useMemo, useState } from 'react';
import {
  getCreatorPayoutRequests,
  getCreatorPayoutTransactions,
} from '../services/creatorEarningsService';
import './CreatorEarningsPage.css';

const MIN_WITHDRAWAL_AMOUNT = 20;

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.payouts)) return data.payouts;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.payoutRequests)) return data.payoutRequests;
  return [];
}

function parseAmount(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return Number(value || 0) || 0;
}

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isWithinRange(dateValue, fromDate, toDate) {
  if (!dateValue) return false;

  const itemDate = new Date(dateValue);
  if (Number.isNaN(itemDate.getTime())) return false;

  if (fromDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    if (itemDate < from) return false;
  }

  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    if (itemDate > to) return false;
  }

  return true;
}

function getQuickRangeDates(rangeKey) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (rangeKey === '7days') {
    start.setDate(now.getDate() - 6);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }

  if (rangeKey === '30days') {
    start.setDate(now.getDate() - 29);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }

  if (rangeKey === 'thisMonth') {
    start.setDate(1);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }

  if (rangeKey === 'thisYear') {
    start.setMonth(0, 1);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }

  return { from: '', to: '' };
}

function buildMonthlyChartData(items) {
  const bucket = new Map();

  items.forEach((item) => {
    const rawDate = item.date || item.created_at;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return;

    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
    bucket.set(key, (bucket.get(key) || 0) + parseAmount(item.amount || item.total));
  });

  return Array.from(bucket.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, total]) => ({
      month,
      total,
    }));
}

function CreatorEarningsPage() {
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [quickRange, setQuickRange] = useState('30days');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const preset = getQuickRangeDates('30days');
    setFromDate(preset.from);
    setToDate(preset.to);
  }, []);

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

        setTransactions(tx);
        setRequests(rq);

        if (!tx.length && !rq.length) {
          setPageMessage('No earnings records available yet.');
        }
      } catch (error) {
        setTransactions([]);
        setRequests([]);
        setErrorMessage(error.message || 'Failed to load earnings data.');
      } finally {
        setLoading(false);
      }
    }

    loadEarnings();
  }, []);

  function applyQuickRange(rangeKey) {
    setQuickRange(rangeKey);
    const preset = getQuickRangeDates(rangeKey);
    setFromDate(preset.from);
    setToDate(preset.to);
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const itemStatus = String(item.status || '').toLowerCase();
      const itemType = String(item.type || item.category || '').toLowerCase();
      const itemDate = item.date || item.created_at;

      const matchesStatus =
        statusFilter === 'all' || itemStatus === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === 'all' || itemType === typeFilter.toLowerCase();

      const matchesDate =
        !fromDate && !toDate ? true : isWithinRange(itemDate, fromDate, toDate);

      return matchesStatus && matchesType && matchesDate;
    });
  }, [transactions, statusFilter, typeFilter, fromDate, toDate]);

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const itemDate = item.created_at || item.date;
      return !fromDate && !toDate ? true : isWithinRange(itemDate, fromDate, toDate);
    });
  }, [requests, fromDate, toDate]);

  const summary = useMemo(() => {
    const completedEarnings = transactions
      .filter((item) => String(item.status || '').toLowerCase() === 'completed')
      .reduce((sum, item) => sum + parseAmount(item.amount || item.total), 0);

    const reservedRequests = requests
      .filter((item) => {
        const status = String(item.status || '').toLowerCase();
        return status === 'pending' || status === 'approved' || status === 'paid';
      })
      .reduce((sum, item) => sum + parseAmount(item.amount || item.total), 0);

    const totalEarned = filteredTransactions.reduce(
      (sum, item) => sum + parseAmount(item.amount || item.total),
      0
    );

    const pendingAmount = filteredTransactions
      .filter((item) => String(item.status || '').toLowerCase() === 'pending')
      .reduce((sum, item) => sum + parseAmount(item.amount || item.total), 0);

    const paidRequestAmount = filteredRequests
      .filter((item) => String(item.status || '').toLowerCase() === 'paid')
      .reduce((sum, item) => sum + parseAmount(item.amount || item.total), 0);

    const availableToWithdraw = Math.max(completedEarnings - reservedRequests, 0);

    return {
      totalEarned,
      totalRequests: filteredRequests.length,
      pendingAmount,
      paidRequestAmount,
      completedTransactions: filteredTransactions.filter(
        (item) => String(item.status || '').toLowerCase() === 'completed'
      ).length,
      availableToWithdraw,
      canWithdraw: availableToWithdraw >= MIN_WITHDRAWAL_AMOUNT,
    };
  }, [filteredTransactions, filteredRequests, transactions, requests]);

  const chartData = useMemo(() => {
    return buildMonthlyChartData(filteredTransactions);
  }, [filteredTransactions]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map((item) => item.total), 0);
    return max || 1;
  }, [chartData]);

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
            <h1>Earnings Dashboard</h1>
            <span>
              Track earnings, filter by date, and view payout activity with a clean mobile-friendly layout.
            </span>
          </div>

          <div className="creator-earnings-header-actions">
            <a href="/creator-dashboard" className="ghost-btn">Dashboard</a>
            <a href="/creator-payout" className="ghost-btn">Payout Page</a>
            {summary.canWithdraw ? (
              <a href="/creator-payout" className="primary-btn">
                Withdraw {formatMoney(summary.availableToWithdraw)}
              </a>
            ) : (
              <button type="button" className="ghost-btn" disabled title="Minimum withdrawal is $20">
                Withdraw locked under {formatMoney(MIN_WITHDRAWAL_AMOUNT)}
              </button>
            )}
          </div>
        </section>

        <section className="creator-earnings-filters">
          <div className="creator-earnings-filters-top">
            <div className="creator-filter-group">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="creator-filter-group">
              <label>Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="ad revenue">Ad Revenue</option>
                <option value="revenue">Revenue</option>
                <option value="referral">Referral</option>
              </select>
            </div>

            <div className="creator-filter-group">
              <label>From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setQuickRange('custom');
                  setFromDate(e.target.value);
                }}
              />
            </div>

            <div className="creator-filter-group">
              <label>To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setQuickRange('custom');
                  setToDate(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="creator-earnings-quick-filters">
            <button
              type="button"
              className={quickRange === '7days' ? 'active' : ''}
              onClick={() => applyQuickRange('7days')}
            >
              7 Days
            </button>
            <button
              type="button"
              className={quickRange === '30days' ? 'active' : ''}
              onClick={() => applyQuickRange('30days')}
            >
              30 Days
            </button>
            <button
              type="button"
              className={quickRange === 'thisMonth' ? 'active' : ''}
              onClick={() => applyQuickRange('thisMonth')}
            >
              This Month
            </button>
            <button
              type="button"
              className={quickRange === 'thisYear' ? 'active' : ''}
              onClick={() => applyQuickRange('thisYear')}
            >
              This Year
            </button>
            <button
              type="button"
              className={quickRange === 'all' ? 'active' : ''}
              onClick={() => {
                setQuickRange('all');
                setFromDate('');
                setToDate('');
              }}
            >
              All Time
            </button>
          </div>
        </section>

        <section className="creator-earnings-stats">
          <div className="creator-earnings-stat-card">
            <p>Total Earned</p>
            <h3>{formatMoney(summary.totalEarned)}</h3>
            <span>Filtered earnings total</span>
          </div>

          <div className="creator-earnings-stat-card">
            <p>Available to Withdraw</p>
            <h3>{formatMoney(summary.availableToWithdraw)}</h3>
            <span>Minimum withdrawal is {formatMoney(MIN_WITHDRAWAL_AMOUNT)}</span>
          </div>

          <div className="creator-earnings-stat-card">
            <p>Payout Requests</p>
            <h3>{summary.totalRequests}</h3>
            <span>Requests in selected range</span>
          </div>

          <div className="creator-earnings-stat-card">
            <p>Paid Out</p>
            <h3>{formatMoney(summary.paidRequestAmount)}</h3>
            <span>Already sent out</span>
          </div>
        </section>

        <section className="creator-earnings-top-grid">
          <div className="creator-earnings-panel">
            <div className="creator-earnings-panel-head">
              <h2>Earnings Trend</h2>
              <span className="creator-earnings-panel-tag">Monthly view</span>
            </div>

            {chartData.length ? (
              <div className="creator-earnings-chart">
                {chartData.map((item) => (
                  <div key={item.month} className="creator-earnings-chart-item">
                    <div className="creator-earnings-chart-bar-outer">
                      <div
                        className="creator-earnings-chart-bar-inner"
                        style={{
                          height: `${Math.max((item.total / maxChartValue) * 180, 10)}px`,
                        }}
                      />
                    </div>
                    <span className="creator-earnings-chart-month">{item.month}</span>
                    <strong className="creator-earnings-chart-amount">{formatMoney(item.total)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="creator-earnings-empty">No chart data in this range.</div>
            )}
          </div>

          <div className="creator-earnings-panel">
            <div className="creator-earnings-panel-head">
              <h2>Quick Insight</h2>
              <span className="creator-earnings-panel-tag">Smart summary</span>
            </div>

            <div className="creator-earnings-insights">
              <div className="creator-earnings-insight-row">
                <span>Completed transactions</span>
                <strong>{summary.completedTransactions}</strong>
              </div>
              <div className="creator-earnings-insight-row">
                <span>Filtered records</span>
                <strong>{filteredTransactions.length}</strong>
              </div>
              <div className="creator-earnings-insight-row">
                <span>Payout requests</span>
                <strong>{filteredRequests.length}</strong>
              </div>
              <div className="creator-earnings-insight-row">
                <span>Withdrawal</span>
                <strong>{summary.canWithdraw ? 'Eligible' : 'Locked'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="creator-earnings-grid">
          <div className="creator-earnings-card">
            <div className="creator-earnings-card-head">
              <h2>Payout Transactions</h2>
              <span className="creator-earnings-count-badge">{filteredTransactions.length}</span>
            </div>

            <div className="creator-earnings-table">
              <div className="creator-earnings-table-head">
                <span>Title</span>
                <span>Type</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {filteredTransactions.length ? (
                filteredTransactions.map((item, index) => (
                  <div className="creator-earnings-table-row" key={item.id || index}>
                    <span>
                      <strong>{item.title || item.description || `Transaction ${index + 1}`}</strong>
                    </span>
                    <span className="muted-text">{item.type || item.category || 'Revenue'}</span>
                    <span className="amount-text">{formatMoney(parseAmount(item.amount || item.total))}</span>
                    <span className={`earnings-status ${String(item.status || 'pending').toLowerCase()}`}>
                      {item.status || 'Pending'}
                    </span>
                    <span className="muted-text">{formatDate(item.date || item.created_at)}</span>
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
              <span className="creator-earnings-count-badge">{filteredRequests.length}</span>
            </div>

            <div className="creator-earnings-table">
              <div className="creator-earnings-table-head request-grid">
                <span>Amount</span>
                <span>Method</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {filteredRequests.length ? (
                filteredRequests.map((item, index) => (
                  <div className="creator-earnings-table-row request-grid" key={item.id || index}>
                    <span className="amount-text">{formatMoney(parseAmount(item.amount || item.total))}</span>
                    <span className="muted-text">{item.method || item.payout_method || '—'}</span>
                    <span className={`earnings-status ${String(item.status || 'pending').toLowerCase()}`}>
                      {item.status || 'Pending'}
                    </span>
                    <span className="muted-text">{formatDate(item.created_at || item.date)}</span>
                  </div>
                ))
              ) : (
                <div className="creator-earnings-empty">No payout requests returned yet.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CreatorEarningsPage;