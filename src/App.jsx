import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import WallpaperPage from "./pages/WallpaperPage";
import TrendingPage from "./pages/TrendingPage";
import ProfilePage from "./pages/ProfilePage";
import AccountPage from "./pages/AccountPage";
import NotificationsPage from "./pages/NotificationsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import AuthPage from "./pages/AuthPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UploadPage from "./pages/UploadPage";
import ErrorPage from "./pages/ErrorPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AdminLoginPage from "./admin/AdminLoginPage";
import AdminRegisterPage from "./admin/AdminRegisterPage";
import AdminDashboardPage from "./admin/AdminDashboardPage";
import AdminWallpapersPage from "./admin/AdminWallpapersPage";
import AdminBulkUploadPage from "./admin/AdminBulkUploadPage";
import AdminUsersPage from "./admin/AdminUsersPage";
import AdminUserWallpapersPage from "./admin/AdminUserWallpapersPage";
import AdminCategoriesPage from "./admin/AdminCategoriesPage";

function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem("wallpaperhub_session");
    return saved ? JSON.parse(saved) : { token: "", user: null };
  });
  const [adminSession, setAdminSession] = useState(() => {
    const saved = localStorage.getItem("wallpaperhub_admin_session");
    return saved ? JSON.parse(saved) : { token: "", admin: null };
  });

  function handleSession(nextSession) {
    setSession(nextSession);
    localStorage.setItem("wallpaperhub_session", JSON.stringify(nextSession));
  }

  function handleLogout() {
    const empty = { token: "", user: null };
    setSession(empty);
    localStorage.setItem("wallpaperhub_session", JSON.stringify(empty));
  }

  function handleAdminSession(token, admin) {
    const next = { token, admin };
    setAdminSession(next);
    localStorage.setItem("wallpaperhub_admin_session", JSON.stringify(next));
  }

  function handleAdminLogout() {
    const empty = { token: "", admin: null };
    setAdminSession(empty);
    localStorage.setItem("wallpaperhub_admin_session", JSON.stringify(empty));
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage session={session} onSession={handleSession} onLogout={handleLogout} />} />
      <Route path="/category/:slug" element={<HomePage session={session} onSession={handleSession} onLogout={handleLogout} />} />
      <Route path="/wallpaper/:name" element={<WallpaperPage session={session} onSession={handleSession} onLogout={handleLogout} />} />
      <Route path="/trending" element={<TrendingPage session={session} onSession={handleSession} onLogout={handleLogout} />} />
      <Route path="/profile/:id" element={<ProfilePage session={session} onSession={handleSession} onLogout={handleLogout} />} />
      <Route path="/my-account" element={<AccountPage session={session} onSession={handleSession} onLogout={handleLogout} />} />
      <Route path="/notifications" element={<NotificationsPage session={session} onSession={handleSession} onLogout={handleLogout} />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/500" element={<ErrorPage code="500" title="Server Error" message="Something went wrong on our side. Please try again later." />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/login"
        element={<LoginPage onSession={handleSession} onAdminSession={handleAdminSession} />}
      />
      <Route path="/register" element={<RegisterPage onSession={handleSession} />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage onSession={handleSession} />} />
      <Route path="/admin/login" element={<AdminLoginPage onAdminToken={handleAdminSession} />} />
      <Route path="/admin/register" element={<AdminRegisterPage />} />
      <Route
        path="/admin/dashboard"
        element={
          adminSession.token ? (
            <AdminDashboardPage adminSession={adminSession} onAdminLogout={handleAdminLogout} />
          ) : (
            <Navigate to="/admin/login" replace />
          )
        }
      />
      <Route
        path="/admin/wallpapers"
        element={
          adminSession.token ? (
            <AdminWallpapersPage adminSession={adminSession} onAdminLogout={handleAdminLogout} />
          ) : (
            <Navigate to="/admin/login" replace />
          )
        }
      />
      <Route
        path="/admin/bulk-upload"
        element={
          adminSession.token ? (
            <AdminBulkUploadPage adminSession={adminSession} onAdminLogout={handleAdminLogout} />
          ) : (
            <Navigate to="/admin/login" replace />
          )
        }
      />
      <Route
        path="/admin/users"
        element={
          adminSession.token ? (
            <AdminUsersPage adminSession={adminSession} onAdminLogout={handleAdminLogout} />
          ) : (
            <Navigate to="/admin/login" replace />
          )
        }
      />
      <Route
        path="/admin/users/:userId/wallpapers"
        element={
          adminSession.token ? (
            <AdminUserWallpapersPage adminSession={adminSession} onAdminLogout={handleAdminLogout} />
          ) : (
            <Navigate to="/admin/login" replace />
          )
        }
      />
      <Route
        path="/admin/categories"
        element={
          adminSession.token ? (
            <AdminCategoriesPage adminSession={adminSession} onAdminLogout={handleAdminLogout} />
          ) : (
            <Navigate to="/admin/login" replace />
          )
        }
      />
      <Route path="/upload" element={<UploadPage session={session} onSession={handleSession} onLogout={handleLogout} />} />
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}

export default App;
