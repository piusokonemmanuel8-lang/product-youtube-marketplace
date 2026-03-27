import React, { useState } from 'react';
import './AdminLoginPage.css';
import adminService from '../services/adminService';

function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await adminService.login(email, password);
      window.location.href = '/admin-dashboard';
    } catch (err) {
      setError(err.message || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <h1>VideoGad Admin</h1>
          <p>Sign in with your admin account</p>
        </div>

        {error ? <div className="admin-login-alert">{error}</div> : null}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-login-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="admin-login-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Login as Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLoginPage;