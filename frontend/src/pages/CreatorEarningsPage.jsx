import React, { useEffect, useMemo, useState } from 'react';
import { getCreatorEarningsDashboard } from '../services/creatorEarningsService';
import './CreatorEarningsPage.css';

const MIN_WITHDRAWAL_AMOUNT = 20;

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.earnings)) return data.earnings;
  if (Array.isArray(data?.payout_requests)) return data.payout_requests;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.requests)) return data.requests;
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
    const rawDate = item.created_at || item.date;
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
  const [earnings, setEarnings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    total_earned: 0,
    available_to_withdraw: 0,
    payout_requests_count: 0,
    paid_out: 0,
    minimum_withdrawal_amount: MIN_WITHDRAWAL_AMOUNT,
    withdraw_locked: true,
  });
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
        const response = await getCreatorEarningsDashboard({
          status: statusFilter,
          type: typeFilter,
          from_date: fromDate,
          to_date: toDate,
        });

        const earningRows = normalizeArrayResponse(response?.earnings || response);
        const payoutRows = normalizeArrayResponse(response?.payout_requests || []);
        const backendSummary = response?.summary || {};

        setEarnings(earningRows);
        setRequests(payoutRows);
        setSummary({
          total_earned: parseAmount(backendSummary.total_earned),
          available_to_withdraw: parseAmount(backendSummary.available_to_withdraw),
          payout_requests_count: Number(backendSummary.payout_requests_count || 0),
          paid_out: parseAmount(backendSummary.paid_out),
          minimum_withdrawal_amount: parseAmount(
            backendSummary.minimum_withdrawal_amount || MIN_WITHDRAWAL_AMOUNT
          ),
          withdraw_locked:
            backendSummary.withdraw_locked !== undefined
              ? Boolean(backendSummary.withdraw_locked)
              : parseAmount(backendSummary.available_to_withdraw) < MIN_WITHDRAWAL_AMOUNT,
        });

        if (!earningRows.length && !payoutRows.length) {
          setPageMessage('No earnings records available yet.');
        }
      } catch (error) {
        setEarnings([]);
        setRequests([]);
        setSummary({
          total_earned: 0,
          available_to_withdraw: 0,
          payout_requests_count: 0,
          paid_out: 0,
          minimum_withdrawal_amount: MIN_WITHDRAWAL_AMOUNT,
          withdraw_locked: true,
        });
        setErrorMessage(error.message || 'Failed to load earnings data.');
      } finally {
        setLoading(false);
      }
    }

    loadEarnings();
  }, [statusFilter, typeFilter, fromDate, toDate]);

  function applyQuickRange(rangeKey) {
    setQuickRange(rangeKey);
    const preset = getQuickRangeDates(rangeKey);
    setFromDate(preset.from);
    setToDate(preset.to);
  }

  const chartData = useMemo(() => {
    return buildMonthlyChartData(earnings);
  }, [earnings]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map((item) => item.total), 0);
    return max || 1;
  }, [chartData]);

  const completedTransactions = useMemo(() => {
    return earnings.filter(
      (item) => String(item.status || '').toLowerCase() === 'completed'
    ).length;
  }, [earnings]);

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
            {summary.withdraw_locked ? (
              <button type="button" className="ghost-btn" disabled title="Minimum withdrawal is $20">
                Withdraw locked under {formatMoney(summary.minimum_withdrawal_amount)}
              </button>
            ) : (
              <a href="/creator-payout" className="primary-btn">
                Withdraw {formatMoney(summary.available_to_withdraw)}
              </a>
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
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="creator-filter-group">
              <label>Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="monetization_earning">Monetization Earning</option>
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
            <h3>{formatMoney(summary.total_earned)}</h3>
            <span>Filtered earnings total</span>
          </div>

          <div className="creator-earnings-stat-card">
            <p>Available to Withdraw</p>
            <h3>{formatMoney(summary.available_to_withdraw)}</h3>
            <span>Minimum withdrawal is {formatMoney(summary.minimum_withdrawal_amount)}</span>
          </div>

          <div className="creator-earnings-stat-card">
            <p>Payout Requests</p>
            <h3>{summary.payout_requests_count}</h3>
            <span>Requests in selected range</span>
          </div>

          <div className="creator-earnings-stat-card">
            <p>Paid Out</p>
            <h3>{formatMoney(summary.paid_out)}</h3>
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
                <strong>{completedTransactions}</strong>
              </div>
              <div className="creator-earnings-insight-row">
                <span>Filtered records</span>
                <strong>{earnings.length}</strong>
              </div>
              <div className="creator-earnings-insight-row">
                <span>Payout requests</span>
                <strong>{requests.length}</strong>
              </div>
              <div className="creator-earnings-insight-row">
                <span>Withdrawal</span>
                <strong>{summary.withdraw_locked ? 'Locked' : 'Eligible'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="creator-earnings-grid">
          <div className="creator-earnings-card">
            <div className="creator-earnings-card-head">
              <h2>Earnings Records</h2>
              <span className="creator-earnings-count-badge">{earnings.length}</span>
            </div>

            <div className="creator-earnings-table">
              <div className="creator-earnings-table-head">
                <span>Title</span>
                <span>Type</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {earnings.length ? (
                earnings.map((item, index) => (
                  <div className="creator-earnings-table-row" key={item.id || index}>
                    <span>
                      <strong>{item.description || `Earning ${index + 1}`}</strong>
                    </span>
                    <span className="muted-text">{item.type || 'monetization_earning'}</span>
                    <span className="amount-text">{formatMoney(parseAmount(item.amount || item.total))}</span>
                    <span className={`earnings-status ${String(item.status || 'completed').toLowerCase()}`}>
                      {item.status || 'completed'}
                    </span>
                    <span className="muted-text">{formatDate(item.created_at || item.date)}</span>
                  </div>
                ))
              ) : (
                <div className="creator-earnings-empty">No earnings records returned yet.</div>
              )}
            </div>
          </div>

          <div className="creator-earnings-card">
            <div className="creator-earnings-card-head">
              <h2>Payout Requests</h2>
              <span className="creator-earnings-count-badge">{requests.length}</span>
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
                    <span className="amount-text">{formatMoney(parseAmount(item.amount || item.total))}</span>
                    <span className="muted-text">{item.method_type || item.method || item.payout_method || '—'}</span>
                    <span className={`earnings-status ${String(item.status || 'pending').toLowerCase()}`}>
                      {item.status || 'Pending'}
                    </span>
                    <span className="muted-text">{formatDate(item.requested_at || item.created_at || item.date)}</span>
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