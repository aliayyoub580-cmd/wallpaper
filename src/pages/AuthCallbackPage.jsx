import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, createUserSession } from "../api";

function getAuthParams() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);

  return {
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
    expiresAt: Number(hashParams.get("expires_at") || 0),
    error: hashParams.get("error_description") || queryParams.get("error_description") || queryParams.get("error"),
  };
}

function AuthCallbackPage({ onSession }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing Google sign-in...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function finishSignIn() {
      const params = getAuthParams();

      if (params.error) {
        setError(params.error);
        return;
      }

      if (!params.accessToken) {
        setError("Google sign-in did not return a valid session. Please try again.");
        return;
      }

      try {
        const data = await apiRequest("/api/auth/me", {
          headers: { Authorization: `Bearer ${params.accessToken}` },
        });

        onSession(createUserSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
          expires_at: params.expiresAt,
        }, data.user));

        setMessage("You are signed in. Redirecting...");
        window.history.replaceState({}, document.title, "/auth/callback");
        window.setTimeout(() => navigate("/", { replace: true }), 700);
      } catch (err) {
        setError(err.message || "Unable to complete Google sign-in.");
      }
    }

    finishSignIn();
  }, [navigate, onSession]);

  return (
    <section className="wh-auth-shell">
      <div className="wh-login-container">
        <div className="wh-login-header">
          <h1><i className="fab fa-google" /> Google Sign-In</h1>
          <p>{error ? "We could not complete sign-in" : message}</p>
        </div>

        {error ? (
          <>
            <div className="wh-alert wh-alert-danger">{error}</div>
            <Link to="/login" className="wh-login-btn text-center text-decoration-none">
              Back to Login
            </Link>
          </>
        ) : (
          <div className="wh-alert wh-alert-success">{message}</div>
        )}
      </div>
    </section>
  );
}

export default AuthCallbackPage;
