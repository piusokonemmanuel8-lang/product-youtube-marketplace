import React, { useEffect, useMemo, useState } from 'react';
import {
  createCreatorPayoutMethod,
  createCreatorPayoutRequest,
  getCreatorPayoutMethods,
  getCreatorPayoutRequests,
  getCreatorPayoutTransactions,
} from '../services/creatorPayoutService';

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.methods)) return data.methods;
  if (Array.isArray(data?.payoutMethods)) return data.payoutMethods;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.payoutRequests)) return data.payoutRequests;
  if (Array.isArray(data?.transactions)) return data.transactions;
  return [];
}

function getDemoMethods() {
  return [
    {
      id: 1,
      method_name: 'Bank Transfer',
      account_name: 'Demo Creator',
      account_number: '0123456789',
      bank_name: 'Access Bank',
      status: 'Active',
    },
  ];
}

function getDemoRequests() {
  return [
    {
      id: 1,
      amount: '$80,000',
      status: 'Pending',
      created_at: '2026-03-22',
      method: 'Bank Transfer',
    },
    {
      id: 2,
      amount: '$35,000',
      status: 'Paid',
      created_at: '2026-03-03',
      method: 'Crypto Wallet',
    },
  ];
}

function getDemoTransactions() {
  return [
    {
      id: 1,
      amount: '$80,000',
      status: 'Completed',
      created_at: '2026-03-20',
      note: 'Payout settled',
    },
    {
      id: 2,
      amount: '$50,000',
      status: 'Completed',
      created_at: '2026-03-10',
      note: 'Bank payout',
    },
  ];
}

function CreatorPayoutPage() {
  const [methods, setMethods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [methodForm, setMethodForm] = useState({
    method_name: 'Bank Transfer',
    account_name: '',
    account_number: '',
    bank_name: '',
    wallet_address: '',
  });

  const [requestForm, setRequestForm] = useState({
    amount: '',
    payout_method_id: '',
  });

  const [submittingMethod, setSubmittingMethod] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  async function loadPayoutPage() {
    setLoading(true);
    setErrorMessage('');
    setPageMessage('');

    try {
      const [methodsResponse, requestsResponse, transactionsResponse] = await Promise.all([
        getCreatorPayoutMethods().catch(() => null),
        getCreatorPayoutRequests().catch(() => null),
        getCreatorPayoutTransactions().catch(() => null),
      ]);

      const methodsData = normalizeArrayResponse(methodsResponse);
      const requestsData = normalizeArrayResponse(requestsResponse);
      const transactionsData = normalizeArrayResponse(transactionsResponse);

      if (!methodsData.length && !requestsData.length && !transactionsData.length) {
        throw new Error('No payout data available yet');
      }

      setMethods(methodsData);
      setRequests(requestsData);
      setTransactions(transactionsData);
      setIsDemoMode(false);

      if (methodsData.length) {
        setRequestForm((prev) => ({
          ...prev,
          payout_method_id: String(methodsData[0].id),
        }));
      }
    } catch (error) {
      const demoMethods = getDemoMethods();
      setMethods(demoMethods);
      setRequests(getDemoRequests());
      setTransactions(getDemoTransactions());
      setIsDemoMode(true);
      setPageMessage('Demo mode is showing because payout data is not available yet.');
      setErrorMessage('');
      setRequestForm((prev) => ({
        ...prev,
        payout_method_id: String(demoMethods[0].id),
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayoutPage();
  }, []);

  const summary = useMemo(() => {
    return {
      methods: methods.length,
      requests: requests.length,
      paid: requests.filter((item) => String(item.status).toLowerCase() === 'paid').length,
      transactions: transactions.length,
    };
  }, [methods, requests, transactions]);

  function handleMethodChange(event) {
    const { name, value } = event.target;
    setMethodForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleRequestChange(event) {
    const { name, value } = event.target;
    setRequestForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleMethodSubmit(event) {
    event.preventDefault();
    setSubmittingMethod(true);
    setErrorMessage('');
    setPageMessage('');

    if (isDemoMode) {
      const demoMethod = {
        id: Date.now(),
        ...methodForm,
        status: 'Active',
      };
      setMethods((prev) => [demoMethod, ...prev]);
      setPageMessage('Demo mode: payout method added locally.');
      setMethodForm({
        method_name: 'Bank Transfer',
        account_name: '',
        account_number: '',
        bank_name: '',
        wallet_address: '',
      });
      setSubmittingMethod(false);
      return;
    }

    try {
      await createCreatorPayoutMethod(methodForm);
      await loadPayoutPage();
      setPageMessage('Payout method added successfully.');
      setMethodForm({
        method_name: 'Bank Transfer',
        account_name: '',
        account_number: '',
        bank_name: '',
        wallet_address: '',
      });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to add payout method');
    } finally {
      setSubmittingMethod(false);
    }
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();
    setSubmittingRequest(true);
    setErrorMessage('');
    setPageMessage('');

    if (isDemoMode) {
      const selectedMethod = methods.find(
        (item) => String(item.id) === String(requestForm.payout_method_id)
      );

      const demoRequest = {
        id: Date.now(),
        amount: requestForm.amount,
        status: 'Pending',
        created_at: 'Just now',
        method: selectedMethod?.method_name || 'Payout Method',
      };

      setRequests((prev) => [demoRequest, ...prev]);
      setPageMessage('Demo mode: payout request added locally.');
      setRequestForm((prev) => ({
        ...prev,
        amount: '',
      }));
      setSubmittingRequest(false);
      return;
    }

    try {
      await createCreatorPayoutRequest(requestForm);
      await loadPayoutPage();
      setPageMessage('Payout request submitted successfully.');
      setRequestForm((prev) => ({
        ...prev,
        amount: '',
      }));
    } catch (error) {
      setErrorMessage(error.message || 'Failed to submit payout request');
    } finally {
      setSubmittingRequest(false);
    }
  }

  if (loading) {
    return (
      <div className="payout-loading-page">
        <div className="payout-loading-card">Loading creator payout...</div>
      </div>
    );
  }

  return (
    <div className="creator-payout-page">
      <div className="creator-payout-shell">
        {errorMessage ? (
          <div className="payout-inline-message error">{errorMessage}</div>
        ) : null}

        {pageMessage ? (
          <div className="payout-inline-message success">{pageMessage}</div>
        ) : null}

        <section className="creator-payout-header">
          <div>
            <p className="eyebrow">Creator Studio</p>
            <h1>Payout</h1>
            <span>Manage payout methods, submit withdrawal requests, and review payout history.</span>
          </div>

          <div className="creator-payout-header-actions">
            <a href="/creator-dashboard" className="ghost-btn">Dashboard</a>
            <a href="/creator-earnings" className="primary-btn">Go to Earnings</a>
          </div>
        </section>

        <section className="creator-payout-stats">
          <div className="creator-payout-stat-card">
            <p>Payout Methods</p>
            <h3>{summary.methods}</h3>
            <span>Available methods</span>
          </div>

          <div className="creator-payout-stat-card">
            <p>Payout Requests</p>
            <h3>{summary.requests}</h3>
            <span>Total requests</span>
          </div>

          <div className="creator-payout-stat-card">
            <p>Paid Requests</p>
            <h3>{summary.paid}</h3>
            <span>Completed payouts</span>
          </div>

          <div className="creator-payout-stat-card">
            <p>Transactions</p>
            <h3>{summary.transactions}</h3>
            <span>History records</span>
          </div>
        </section>

        <section className="creator-payout-grid">
          <div className="creator-payout-card">
            <div className="creator-payout-card-head">
              <h2>Add Payout Method</h2>
            </div>

            <form className="creator-payout-form" onSubmit={handleMethodSubmit}>
              <div className="creator-payout-form-group">
                <label>Method Type</label>
                <select
                  name="method_name"
                  value={methodForm.method_name}
                  onChange={handleMethodChange}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Crypto Wallet">Crypto Wallet</option>
                </select>
              </div>

              <div className="creator-payout-form-group">
                <label>Account Name</label>
                <input
                  type="text"
                  name="account_name"
                  value={methodForm.account_name}
                  onChange={handleMethodChange}
                  placeholder="Enter account name"
                />
              </div>

              <div className="creator-payout-form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  name="account_number"
                  value={methodForm.account_number}
                  onChange={handleMethodChange}
                  placeholder="Enter account number"
                />
              </div>

              <div className="creator-payout-form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  value={methodForm.bank_name}
                  onChange={handleMethodChange}
                  placeholder="Enter bank name"
                />
              </div>

              <div className="creator-payout-form-group">
                <label>Wallet Address</label>
                <input
                  type="text"
                  name="wallet_address"
                  value={methodForm.wallet_address}
                  onChange={handleMethodChange}
                  placeholder="Enter wallet address"
                />
              </div>

              <button type="submit" className="creator-payout-submit-btn" disabled={submittingMethod}>
                {submittingMethod ? 'Saving...' : 'Save Method'}
              </button>
            </form>
          </div>

          <div className="creator-payout-card">
            <div className="creator-payout-card-head">
              <h2>Request Payout</h2>
            </div>

            <form className="creator-payout-form" onSubmit={handleRequestSubmit}>
              <div className="creator-payout-form-group">
                <label>Amount</label>
                <input
                  type="text"
                  name="amount"
                  value={requestForm.amount}
                  onChange={handleRequestChange}
                  placeholder="Enter amount"
                />
              </div>

              <div className="creator-payout-form-group">
                <label>Payout Method</label>
                <select
                  name="payout_method_id"
                  value={requestForm.payout_method_id}
                  onChange={handleRequestChange}
                >
                  {methods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.method_name || method.name || `Method ${method.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="creator-payout-submit-btn" disabled={submittingRequest}>
                {submittingRequest ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>

            <div className="creator-payout-methods-list">
              <h3>Saved Methods</h3>

              {methods.length ? (
                methods.map((method, index) => (
                  <div className="creator-payout-method-item" key={method.id || index}>
                    <strong>{method.method_name || method.name || 'Payout Method'}</strong>
                    <p>
                      {method.account_name || '—'} {method.account_number ? `• ${method.account_number}` : ''}
                    </p>
                    <span>{method.bank_name || method.wallet_address || method.status || 'Active'}</span>
                  </div>
                ))
              ) : (
                <div className="creator-payout-empty">No payout methods yet.</div>
              )}
            </div>
          </div>
        </section>

        <section className="creator-payout-history-grid">
          <div className="creator-payout-card">
            <div className="creator-payout-card-head">
              <h2>Payout Requests</h2>
            </div>

            <div className="creator-payout-table">
              <div className="creator-payout-table-head request-grid">
                <span>Amount</span>
                <span>Method</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {requests.length ? (
                requests.map((item, index) => (
                  <div className="creator-payout-table-row request-grid" key={item.id || index}>
                    <span>{item.amount || item.total || '—'}</span>
                    <span>{item.method || item.payout_method || '—'}</span>
                    <span className={`payout-status ${String(item.status || 'pending').toLowerCase()}`}>
                      {item.status || 'Pending'}
                    </span>
                    <span>{item.created_at || item.date || '—'}</span>
                  </div>
                ))
              ) : (
                <div className="creator-payout-empty">No payout requests returned yet.</div>
              )}
            </div>
          </div>

          <div className="creator-payout-card">
            <div className="creator-payout-card-head">
              <h2>Payout Transactions</h2>
            </div>

            <div className="creator-payout-table">
              <div className="creator-payout-table-head transaction-grid">
                <span>Amount</span>
                <span>Status</span>
                <span>Date</span>
                <span>Note</span>
              </div>

              {transactions.length ? (
                transactions.map((item, index) => (
                  <div className="creator-payout-table-row transaction-grid" key={item.id || index}>
                    <span>{item.amount || item.total || '—'}</span>
                    <span className={`payout-status ${String(item.status || 'pending').toLowerCase()}`}>
                      {item.status || 'Pending'}
                    </span>
                    <span>{item.created_at || item.date || '—'}</span>
                    <span>{item.note || item.description || '—'}</span>
                  </div>
                ))
              ) : (
                <div className="creator-payout-empty">No payout transactions returned yet.</div>
              )}
            </div>
          </div>
        </section>

        {isDemoMode ? (
          <div className="creator-payout-note">
            Some payout values are demo placeholders because backend payout records are not yet available.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default CreatorPayoutPage;