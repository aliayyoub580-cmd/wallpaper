import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

function AdminRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", password_confirmation: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("/api/admin/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      navigate("/admin/login");
    } catch (err) {
      setError(err.message || "Unable to create admin account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="wh-auth-shell">
      <div className="wh-register-container">
        <div className="wh-back-home">
          <Link to="/admin/login">
            <i className="fas fa-arrow-left" /> Back to Admin Login
          </Link>
        </div>

        <div className="wh-register-header">
          <h1><i className="fas fa-user-shield" /> Admin Register</h1>
          <p>Create an administrator account</p>
        </div>

        {error ? <div className="wh-alert wh-alert-danger">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="wh-form-group">
            <label htmlFor="admin-name">Full Name</label>
            <input id="admin-name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
          </div>
          <div className="wh-form-group">
            <label htmlFor="admin-email">Email Address</label>
            <input id="admin-email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required />
          </div>
          <div className="wh-form-group">
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" minLength={8} value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required />
          </div>
          <div className="wh-form-group">
            <label htmlFor="admin-password-confirmation">Confirm Password</label>
            <input id="admin-password-confirmation" type="password" minLength={8} value={form.password_confirmation} onChange={(event) => setForm((prev) => ({ ...prev, password_confirmation: event.target.value }))} required />
          </div>

          <button type="submit" className="wh-register-btn" disabled={isSubmitting}>
            <i className="fas fa-user-plus" /> {isSubmitting ? "Creating..." : "Create Admin"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AdminRegisterPage;
