import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, createUserSession, getApiUrl } from "../api";

function RegisterPage({ onSession }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      if (data.session?.access_token) {
        onSession(createUserSession(data.session, data.user));
        navigate("/");
        return;
      }

      setSuccess(data.message || "A confirmation link has been sent to your email address. Please confirm your email before signing in.");
    } catch (err) {
      setError(err.message || "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    window.location.assign(getApiUrl("/api/auth/google"));
  }

  return (
    <section className="wh-auth-shell">
      <div className="wh-register-container">
        <div className="wh-back-home">
          <Link to="/">
            <i className="fas fa-arrow-left" /> Back to Home
          </Link>
        </div>

        <div className="wh-register-header">
          <h1>
            <i className="fas fa-user-plus" /> Create Account
          </h1>
          <p>Join our wallpaper community</p>
        </div>

        {error ? <div className="wh-alert wh-alert-danger">{error}</div> : null}
        {success ? <div className="wh-alert wh-alert-success">{success}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="wh-form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              placeholder="Your Name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="wh-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="your@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="wh-form-group">
            <label htmlFor="password">Password</label>
            <div className="wh-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="........"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="wh-toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
              </button>
            </div>
          </div>

          <div className="wh-form-group">
            <label htmlFor="password_confirmation">Confirm Password</label>
            <div className="wh-password-wrapper">
              <input
                type={showConfirmation ? "text" : "password"}
                id="password_confirmation"
                placeholder="........"
                minLength={8}
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
              />
              <button
                type="button"
                className="wh-toggle-password"
                onClick={() => setShowConfirmation((prev) => !prev)}
              >
                <i className={`fas ${showConfirmation ? "fa-eye-slash" : "fa-eye"}`} />
              </button>
            </div>
          </div>

          <button type="submit" className="wh-register-btn" disabled={isSubmitting}>
            <i className="fas fa-user-plus" /> {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="wh-oauth-divider"><span>or</span></div>

        <button type="button" className="wh-google-btn" onClick={handleGoogleLogin} disabled={isSubmitting}>
          <i className="fab fa-google" /> Continue with Google
        </button>

        <div className="wh-login-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </section>
  );
}

export default RegisterPage;
