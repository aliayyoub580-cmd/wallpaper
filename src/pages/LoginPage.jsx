import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, createUserSession, getApiUrl } from "../api";

function LoginPage({ onSession, onAdminSession }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("user");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleUserLogin(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: userEmail,
          password: userPassword,
        }),
      });

      if (data.success === false) {
        setError(data.message || "Unable to sign in.");
        return;
      }

      if (data.session?.access_token) {
        onSession(createUserSession(data.session, data.user));
        navigate("/");
        return;
      }

      setError("Login succeeded but session token was not returned.");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    window.location.assign(getApiUrl("/api/auth/google"));
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });

      if (data.token && data.admin) {
        onAdminSession(data.token, data.admin);
        navigate("/admin/dashboard");
        return;
      }

      setError("Admin login succeeded but token was not returned.");
    } catch (err) {
      setError(err.message || "Unable to sign in as admin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="wh-auth-shell">
      <div className="wh-login-container">
        <div className="wh-back-home">
          <Link to="/">
            <i className="fas fa-arrow-left" /> Back to Home
          </Link>
        </div>

        <div className="wh-login-header">
          <h1>
            <i className="fas fa-sign-in-alt" /> Welcome Back
          </h1>
          <p>Choose your login type</p>
        </div>

        <div className="wh-login-tabs">
          <button
            type="button"
            className={`wh-tab-button ${activeTab === "user" ? "active" : ""}`}
            onClick={() => setActiveTab("user")}
          >
            <i className="fas fa-user" /> User
          </button>
          <button
            type="button"
            className={`wh-tab-button ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => setActiveTab("admin")}
          >
            <i className="fas fa-shield-alt" /> Admin
          </button>
        </div>

        {error ? <div className="wh-alert wh-alert-danger">{error}</div> : null}

        <div className={`wh-tab-content ${activeTab === "user" ? "active" : ""}`}>
          <form onSubmit={handleUserLogin}>
            <div className="wh-form-group">
              <label htmlFor="user-email">Email Address</label>
              <input
                type="email"
                id="user-email"
                placeholder="your@email.com"
                autoComplete="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </div>

            <div className="wh-form-group">
              <label htmlFor="user-password">Password</label>
              <div className="wh-password-wrapper">
                <input
                  type={showUserPassword ? "text" : "password"}
                  id="user-password"
                  placeholder="........"
                  autoComplete="current-password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="wh-toggle-password"
                  onClick={() => setShowUserPassword((prev) => !prev)}
                >
                  <i className={`fas ${showUserPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </div>

            <button type="submit" className="wh-login-btn" disabled={isSubmitting}>
              <i className="fas fa-sign-in-alt" /> {isSubmitting ? "Signing In..." : "Sign In as User"}
            </button>
          </form>

          <div className="wh-oauth-divider"><span>or</span></div>

          <button type="button" className="wh-google-btn" onClick={handleGoogleLogin} disabled={isSubmitting}>
            <i className="fab fa-google" /> Continue with Google
          </button>

          <div className="wh-register-link">
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </div>
        </div>

        <div className={`wh-tab-content ${activeTab === "admin" ? "active" : ""}`}>
          <form onSubmit={handleAdminLogin}>
            <div className="wh-form-group">
              <label htmlFor="admin-email">Admin Email</label>
              <input
                type="email"
                id="admin-email"
                placeholder="admin@email.com"
                autoComplete="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>

            <div className="wh-form-group">
              <label htmlFor="admin-password">Password</label>
              <div className="wh-password-wrapper">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  id="admin-password"
                  placeholder="........"
                  autoComplete="current-password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="wh-toggle-password"
                  onClick={() => setShowAdminPassword((prev) => !prev)}
                >
                  <i className={`fas ${showAdminPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </div>

            <button type="submit" className="wh-login-btn" disabled={isSubmitting}>
              <i className="fas fa-shield-alt" /> {isSubmitting ? "Signing In..." : "Sign In as Admin"}
            </button>
          </form>

          <div className="wh-register-link">
            New admin? <Link to="/admin/register">Register here</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
