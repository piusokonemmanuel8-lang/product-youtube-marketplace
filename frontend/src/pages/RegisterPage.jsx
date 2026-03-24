function RegisterPage() {
  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="brand-row">
          <div className="brand-icon">V</div>
          <div>
            <h1>VideoGad</h1>
            <p className="subtitle">Create account</p>
          </div>
        </div>

        <form className="auth-form">
          <input type="text" placeholder="Full name" />
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button type="submit">Register</button>
        </form>

        <p className="helper-text">
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage