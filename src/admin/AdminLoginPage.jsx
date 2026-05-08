import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

function AdminLoginPage({ onAdminToken }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.token) {
        onAdminToken(result.token, result.admin);
        navigate("/admin/dashboard");
      }
    } catch (err) {
      setError(err.message);
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
          <h1><i className="fas fa-shield-alt" /> Admin Login</h1>
          <p>Sign in to manage WallpaperHub</p>
        </div>

        {error ? <div className="wh-alert wh-alert-danger">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="wh-form-group">
            <label htmlFor="admin-email">Admin Email</label>
            <input id="admin-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="admin@email.com" required />
          </div>
          <div className="wh-form-group">
            <label htmlFor="admin-password">Password</label>
            <div className="wh-password-wrapper">
              <input id="admin-password" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="........" required />
              <button type="button" className="wh-toggle-password" onClick={() => setShowPassword((prev) => !prev)}>
                <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
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
    </section>
  );
}

export default AdminLoginPage;
