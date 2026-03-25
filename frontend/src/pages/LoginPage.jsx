import React, { useState } from 'react';
import { loginUser } from '../services/authService';

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await loginUser(formData);

      if (response?.token) {
        localStorage.setItem('token', response.token);
      }

      if (response?.user) {
        localStorage.setItem('currentUser', JSON.stringify(response.user));
      }

      setSuccessMessage('Login successful.');

      setTimeout(() => {
        window.location.href = '/creator-dashboard';
      }, 800);
    } catch (error) {
      setErrorMessage(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>VideoGad</h1>
          <p>Sign in to continue</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
          {successMessage ? <div className="auth-message success">{successMessage}</div> : null}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <div className="auth-footer-links">
            <a href="/register">Create account</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;