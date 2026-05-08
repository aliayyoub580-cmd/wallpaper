import { NavLink, useNavigate } from "react-router-dom";

function AdminLayout({ admin, onLogout, title, children }) {
  const navigate = useNavigate();

  function handleLogout() {
    onLogout();
    navigate("/admin/login");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
          <div className="admin-logo-wrap">
            <img src="/images/Logo1.png" alt="WallHub" className="admin-logo" />
          </div>

        <nav className="admin-nav">
          <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-chart-line" /> Dashboard
          </NavLink>
          <NavLink to="/admin/wallpapers" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-images" /> Wallpapers
          </NavLink>
          <NavLink to="/admin/bulk-upload" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-cloud-upload-alt" /> Bulk Upload
          </NavLink>
          <NavLink to="/admin/categories" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-folder-open" /> Categories
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-users" /> Users
          </NavLink>
        </nav>

        <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <h1>{title}</h1>
          <div className="admin-user-pill">
            <span>{admin?.name || admin?.email || "Admin"}</span>
            <div className="admin-avatar">{(admin?.name || admin?.email || "A").slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <section className="admin-content">{children}</section>
      </main>
    </div>
  );
}

export default AdminLayout;
