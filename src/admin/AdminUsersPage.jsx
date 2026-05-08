import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import AdminLayout from "./components/AdminLayout";

function AdminUsersPage({ adminSession, onAdminLogout }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const payload = await apiRequest("/api/admin/users", {
        headers: { Authorization: `Bearer ${adminSession.token}` },
      });
      setUsers(payload.users || []);
    } catch (err) {
      setError(err.message);
    }
  }, [adminSession.token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function deleteUser(id) {
    if (!window.confirm("Delete user and all wallpapers? This cannot be undone.")) return;

    await apiRequest(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminSession.token}` },
    });
    setMessage("User account and all wallpapers deleted successfully.");
    await loadUsers();
  }

  return (
    <AdminLayout admin={adminSession.admin} onLogout={onAdminLogout} title="Users Management">
      {message ? <p className="wh-alert wh-alert-success">{message}</p> : null}
      {error ? <p className="wh-alert wh-alert-danger">{error}</p> : null}

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id}>
                  <td>{row.name || "-"}</td>
                  <td>{row.email}</td>
                  <td>{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
                  <td className="actions-cell">
                    <Link to={`/admin/users/${row.id}/wallpapers`} className="admin-link-btn">Wallpapers</Link>
                    <button type="button" className="danger" onClick={() => deleteUser(row.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminUsersPage;
