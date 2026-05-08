import { Link } from "react-router-dom";

function VerifyEmailPage() {
  return (
    <section className="wh-auth-shell">
      <div className="wh-login-container">
        <div className="wh-login-header">
          <h1><i className="fas fa-envelope-circle-check" /> Verify Email</h1>
          <p>Please check your inbox and verify your email address before signing in.</p>
        </div>
        <div className="wh-alert wh-alert-success">
          A verification link may be required depending on your Supabase auth settings.
        </div>
        <Link to="/login" className="wh-login-btn text-center text-decoration-none">
          <i className="fas fa-sign-in-alt" /> Back to Login
        </Link>
      </div>
    </section>
  );
}

export default VerifyEmailPage;
