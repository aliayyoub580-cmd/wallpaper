import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import AdminLayout from "./components/AdminLayout";

function StatCard({ icon, label, value }) {
  return (
    <article className="stat-card">
      <div className="stat-icon"><i className={icon} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{Number(value || 0).toLocaleString()}</div>
    </article>
  );
}

function AdminDashboardPage({ adminSession, onAdminLogout }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${adminSession.token}` },
    })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [adminSession.token]);

  return (
    <AdminLayout admin={adminSession.admin} onLogout={onAdminLogout} title="Admin Dashboard">
      {error ? <p className="error-text">{error}</p> : null}
      {!data ? (
        <p>Loading dashboard...</p>
      ) : (
        <>
          <div className="dashboard-stats">
            <StatCard icon="fas fa-images" label="Total Wallpapers" value={data.totalWallpapers} />
            <StatCard icon="fas fa-folder" label="Parent Categories" value={data.totalCategories} />
            <StatCard icon="fas fa-users" label="Total Users" value={data.totalUsers} />
            <StatCard icon="fas fa-eye" label="Total Views" value={data.totalViews} />
            <StatCard icon="fas fa-heart" label="Total Likes" value={data.totalLikes} />
            <StatCard icon="fas fa-download" label="Total Downloads" value={data.totalDownloads} />
          </div>

          <div className="quick-actions">
            <Link to="/admin/wallpapers" className="quick-action-card">
              <i className="fas fa-images" />
              <span>Manage Wallpapers</span>
            </Link>
            <Link to="/admin/bulk-upload" className="quick-action-card">
              <i className="fas fa-cloud-upload-alt" />
              <span>Bulk Upload</span>
            </Link>
            <Link to="/admin/categories" className="quick-action-card">
              <i className="fas fa-folder-open" />
              <span>Manage Categories</span>
            </Link>
            <Link to="/admin/users" className="quick-action-card">
              <i className="fas fa-users" />
              <span>Manage Users</span>
            </Link>
          </div>

          <div className="admin-dashboard-columns">
            <section className="admin-card">
              <h3><i className="fas fa-clock me-2" />Recent Wallpapers</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Created</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {(data.recentWallpapers || []).map((row) => (
                      <tr key={row.id}>
                        <td>{row.name || row.title || row.filename}</td>
                        <td>{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
                        <td><Link to="/admin/wallpapers">Manage</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-card">
              <h3><i className="fas fa-fire me-2" />Popular Wallpapers</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Views</th><th>Likes</th></tr>
                  </thead>
                  <tbody>
                    {(data.popularWallpapers || []).map((row) => (
                      <tr key={row.id}>
                        <td>{row.name || row.title || row.filename}</td>
                        <td>{(row.views || 0).toLocaleString()}</td>
                        <td>{(row.likes_count || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export default AdminDashboardPage;
