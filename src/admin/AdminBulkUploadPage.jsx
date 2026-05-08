import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, getApiUrl } from "../api";
import AdminLayout from "./components/AdminLayout";

function AdminBulkUploadPage({ adminSession, onAdminLogout }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [files, setFiles] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [progress, setProgress] = useState({ visible: false, value: 0, text: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/admin/categories", {
      headers: { Authorization: `Bearer ${adminSession.token}` },
    })
      .then((payload) => setCategories(payload.categories || []))
      .catch((err) => setError(err.message));
  }, [adminSession.token]);

  function chooseFiles(selectedFiles) {
    const nextFiles = Array.from(selectedFiles || []);
    setFiles(nextFiles);
    setError("");
  }

  function handleDrop(event) {
    event.preventDefault();
    chooseFiles(event.dataTransfer.files);
  }

  function submit(event) {
    event.preventDefault();

    if (files.length === 0) {
      setError("Choose at least one wallpaper file.");
      return;
    }

    if (!categoryId) {
      setError("Choose a category for these wallpapers.");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("wallpapers", file));
    formData.append("categoryIds", categoryId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", getApiUrl("/api/admin/wallpapers/bulk-upload"));
    xhr.setRequestHeader("Authorization", `Bearer ${adminSession.token}`);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      const percentage = Math.round((event.loaded / event.total) * 100);
      setProgress({ visible: true, value: percentage, text: `${percentage}% uploaded` });
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress({ visible: true, value: 100, text: "Upload complete" });
        window.setTimeout(() => navigate("/admin/wallpapers"), 1000);
        return;
      }

      try {
        const payload = JSON.parse(xhr.responseText || "{}");
        setError(payload.message || "Bulk upload failed.");
      } catch (_error) {
        setError("Bulk upload failed.");
      }
      setProgress({ visible: false, value: 0, text: "" });
    });

    xhr.addEventListener("error", () => {
      setError("Network error during upload.");
      setProgress({ visible: false, value: 0, text: "" });
    });

    setProgress({ visible: true, value: 0, text: "Preparing upload..." });
    xhr.send(formData);
  }

  const parents = categories.filter((category) => category.parent_id == null);

  return (
    <AdminLayout admin={adminSession.admin} onLogout={onAdminLogout} title="Bulk Upload">
      <div className="admin-card wh-admin-toolbar">
        <div>
          <h3>Upload Multiple Wallpapers</h3>
          <p>Select files once, assign a category, and upload them together.</p>
        </div>
        <Link to="/admin/wallpapers" className="admin-link-btn">
          <i className="fas fa-images" /> All Wallpapers
        </Link>
      </div>

      {error ? <p className="wh-alert wh-alert-danger">{error}</p> : null}

      <form className="admin-card wh-bulk-upload-card" onSubmit={submit}>
        <div
          className={`wh-bulk-dropzone ${files.length ? "has-files" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/jpg,image/webp,video/mp4"
            onChange={(event) => chooseFiles(event.target.files)}
            hidden
          />
          <i className="fas fa-cloud-upload-alt" />
          <h4>{files.length ? `${files.length} file(s) selected` : "Drag and drop wallpapers here"}</h4>
          <p>JPG, PNG, WEBP, or MP4. Images max 8MB, videos max 17MB.</p>
          <button type="button" className="admin-gold-btn">Choose Files</button>
        </div>

        {files.length ? (
          <div className="wh-bulk-file-list">
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`}>
                <span>{file.name}</span>
                <em>{(file.size / (1024 * 1024)).toFixed(2)}MB</em>
              </div>
            ))}
          </div>
        ) : null}

        <h4 className="wh-bulk-section-title">Category</h4>
        <div className="wh-admin-category-picker">
          {parents.map((category) => {
            const children = categories.filter((item) => item.parent_id === category.id);

            return (
              <div className="wh-admin-category-group" key={category.id}>
                <label>
                  <input type="radio" name="bulk-category" value={category.id} checked={String(categoryId) === String(category.id)} onChange={(event) => setCategoryId(event.target.value)} />
                  {category.icon || <i className="fas fa-folder" />} {category.name}
                </label>
                {children.length ? (
                  <div className="wh-admin-category-children">
                    {children.map((child) => (
                      <label key={child.id}>
                        <input type="radio" name="bulk-category" value={child.id} checked={String(categoryId) === String(child.id)} onChange={(event) => setCategoryId(event.target.value)} />
                        {child.icon || <i className="fas fa-tag" />} {child.name}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {progress.visible ? (
          <div className="wh-upload-progress">
            <div><span>{progress.text}</span><span>{progress.value}%</span></div>
            <div className="wh-upload-progress-bar"><span style={{ width: `${progress.value}%` }} /></div>
          </div>
        ) : null}

        <div className="wh-modal-actions">
          <Link to="/admin/wallpapers" className="wh-btn-secondary">Cancel</Link>
          <button type="submit" className="wh-btn-primary">
            <i className="fas fa-upload" /> Upload Wallpapers
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}

export default AdminBulkUploadPage;
