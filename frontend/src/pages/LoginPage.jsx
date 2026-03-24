function LoginPage() {
  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="brand-row">
          <div className="brand-icon">V</div>
          <div>
            <h1>VideoGad</h1>
            <p className="subtitle">Creator login</p>
          </div>
        </div>

        <form className="auth-form">
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button type="submit">Login</button>
        </form>

        <p className="helper-text">
          Don&apos;t have an account? <a href="/register">Create one</a>
        </p>
      </div>
    </div>
  )
}

export default LoginPage