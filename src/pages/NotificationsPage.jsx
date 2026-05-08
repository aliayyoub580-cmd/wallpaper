import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Header from "../components/Header";
import { apiRequest } from "../api";

function timeLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function iconFor(type) {
  if (type === "like") return "fa-heart";
  if (type === "view") return "fa-eye";
  return "fa-bell";
}

function NotificationsPage({ session, onLogout }) {
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = useCallback(async () => {
    const payload = await apiRequest("/api/notifications", {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    setNotifications(payload.data || []);
  }, [session.token]);

  useEffect(() => {
    if (!session.token) return;
    loadNotifications().catch(() => setNotifications([]));
  }, [loadNotifications, session.token]);

  if (!session.token) {
    return <Navigate to="/login" replace />;
  }

  async function markAsRead(notification) {
    if (!notification.read) {
      await apiRequest(`/api/notifications/${notification.id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      await loadNotifications();
    }
  }

  async function markAllAsRead() {
    await apiRequest("/api/notifications/read-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    await loadNotifications();
  }

  return (
    <div className="wh-notifications-page">
      <Header user={session.user} onLogout={onLogout} />
      <main className="container">
        <div className="row">
          <div className="col-md-10 offset-md-1">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="wh-notifications-title">Notifications</h1>
              {notifications.some((notification) => !notification.read) ? (
                <button type="button" className="btn btn-outline-warning" onClick={markAllAsRead}>
                  <i className="fa-solid fa-check-double me-2" />Mark All as Read
                </button>
              ) : null}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-5">
                <i className="fa-solid fa-bell-slash wh-empty-bell" />
                <h3 className="mt-3">No notifications yet</h3>
                <p>You will see notifications here when someone likes your wallpapers</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`notification-card ${notification.read ? "" : "unread"}`}
                  onClick={() => markAsRead(notification)}
                >
                  <div className="d-flex align-items-center text-start">
                    <div className={`notification-icon ${notification.type || ""}`}>
                      <i className={`fa-solid ${iconFor(notification.type)}`} />
                    </div>
                    <div className="flex-grow-1">
                      <h5>{notification.title}</h5>
                      <p>{notification.message}</p>
                      <div className="notification-time">{timeLabel(notification.created_at)}</div>
                    </div>
                    {!notification.read ? <span className="wh-unread-dot" /> : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default NotificationsPage;
