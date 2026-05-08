import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiRequest, getApiUrl, getFreshUserSession } from "../api";

const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;

function UploadPage({ session, onSession, onLogout }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [expandedParents, setExpandedParents] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isImageValid, setIsImageValid] = useState(false);
  const [refreshingCategories, setRefreshingCategories] = useState(false);
  const [validationProgress, setValidationProgress] = useState({
    visible: false,
    value: 0,
  });
  const [validationStatus, setValidationStatus] = useState({
    visible: false,
    type: "success",
    text: "",
  });
  const [uploadProgress, setUploadProgress] = useState({
    visible: false,
    value: 0,
    percentage: "0%",
    statusText: "Preparing upload...",
    detailsText: "",
    etaText: "",
    isError: false,
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function loadCategories() {
    try {
      const data = await apiRequest("/api/categories");
      setCategories(data);
    } catch (err) {
      setValidationStatus({
        visible: true,
        type: "error",
        text: err.message || "Error loading categories.",
      });
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  if (!session?.token) {
    return <Navigate to="/login" replace />;
  }

  function setStatus(type, text) {
    setValidationStatus({ visible: true, type, text });
  }

  function validateImageDimensions(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          let progress = 0;
          setValidationProgress({ visible: true, value: 0 });

          const interval = window.setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 90) progress = 90;
            setValidationProgress({ visible: true, value: Math.round(progress) });
          }, 100);

          window.setTimeout(() => {
            window.clearInterval(interval);
            setValidationProgress({ visible: true, value: 100 });
            const valid = img.width >= MIN_WIDTH && img.height >= MIN_HEIGHT;

            window.setTimeout(() => {
              setValidationProgress({ visible: false, value: 0 });
              resolve({ valid, width: img.width, height: img.height });
            }, 300);
          }, 500);
        };

        img.onerror = () => resolve({ valid: false, error: true });
        img.src = event.target?.result;
      };

      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelection(file) {
    if (!file) return;

    const isVideo = file.type.startsWith("video/");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    setSelectedFile(file);

    if (isVideo) {
      if (file.size > 17825792) {
        setSelectedFile(null);
        setIsImageValid(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setStatus("error", "Video files must be 17MB or smaller.");
        return;
      }

      setIsImageValid(true);
      setStatus("success", `Video file accepted: ${file.name}`);
      return;
    }

    if (file.size > 8388608) {
      setSelectedFile(null);
      setIsImageValid(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setStatus("error", "Image files must be 8MB or smaller.");
      return;
    }

    const result = await validateImageDimensions(file);

    if (result.error) {
      setSelectedFile(null);
      setIsImageValid(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setStatus("warning", "Error: Could not load image. Please try another file.");
      return;
    }

    if (!result.valid) {
      setSelectedFile(null);
      setIsImageValid(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setStatus(
        "error",
        `Image too small: ${result.width}x${result.height}. Minimum required: ${MIN_WIDTH}x${MIN_HEIGHT} (720p)`
      );
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsImageValid(true);
    setStatus(
      "success",
      `Image valid: ${result.width}x${result.height} (${result.width}x${result.height} is suitable for wallpapers)`
    );
  }

  function handleDrop(event) {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (droppedFile.type.startsWith("image/") || droppedFile.type === "video/mp4") {
      handleFileSelection(droppedFile);
    }
  }

  function toggleParentCategory(parentId, checked) {
    const parent = categories.find((item) => item.id === parentId);
    const childIds = (parent?.children || []).map((child) => child.id);

    setSelectedCategoryIds((prev) => {
      const next = prev.filter((id) => !childIds.includes(id));

      if (checked) {
        if (!next.includes(parentId)) next.push(parentId);
      } else {
        return next.filter((id) => id !== parentId);
      }

      return next;
    });
  }

  function toggleChildCategory(parentId, childId, checked) {
    const parent = categories.find((item) => item.id === parentId);
    const siblingIds = (parent?.children || []).map((child) => child.id);

    setSelectedCategoryIds((prev) => {
      let next = prev.filter((id) => id !== parentId);

      if (checked) {
        next = next.filter((id) => !siblingIds.includes(id));
        next.push(childId);
      } else {
        next = next.filter((id) => id !== childId);
      }

      return next;
    });
  }

  function toggleSimpleCategory(categoryId, checked) {
    setSelectedCategoryIds((prev) => {
      if (checked && !prev.includes(categoryId)) {
        return [...prev, categoryId];
      }
      return prev.filter((id) => id !== categoryId);
    });
  }

  function getStatusStyle() {
    if (validationStatus.type === "success") {
      return {
        background: "rgba(76, 175, 80, 0.15)",
        borderLeft: "3px solid #4CAF50",
        color: "#4CAF50",
        icon: "fas fa-check-circle",
      };
    }

    if (validationStatus.type === "warning") {
      return {
        background: "rgba(255, 152, 0, 0.15)",
        borderLeft: "3px solid #ff9800",
        color: "#ff9800",
        icon: "fas fa-exclamation-circle",
      };
    }

    return {
      background: "rgba(244, 67, 54, 0.15)",
      borderLeft: "3px solid #f44336",
      color: "#f44336",
      icon: "fas fa-times-circle",
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile || !isImageValid) {
      setStatus("error", "Please select a valid image with at least 1280x720 resolution.");
      return;
    }

    if (selectedCategoryIds.length === 0) {
      setStatus("error", "Please select at least one category.");
      return;
    }

    setIsUploading(true);
    setUploadProgress({
      visible: true,
      value: 0,
      percentage: "0%",
      statusText: "Checking login session...",
      detailsText: "Preparing...",
      etaText: "",
      isError: false,
    });

    let uploadSession;
    try {
      uploadSession = await getFreshUserSession(session);
      if (uploadSession !== session && onSession) {
        onSession(uploadSession);
      }
    } catch (err) {
      setUploadProgress({
        visible: true,
        value: 0,
        percentage: "0%",
        statusText: "Upload Failed",
        detailsText: "Login required",
        etaText: "",
        isError: true,
      });
      setStatus("error", err.message || "Please log in again before uploading.");
      setIsUploading(false);
      if (onLogout) onLogout();
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("categoryIds", selectedCategoryIds.join(","));
    formData.append("image", selectedFile);

    const xhr = new XMLHttpRequest();
    const totalSize = selectedFile.size;
    const totalMb = (totalSize / (1024 * 1024)).toFixed(2);
    let intervalId = null;

    xhr.upload.addEventListener("loadend", () => {
      let simulatedProgress = 0;
      const startedAt = Date.now();

      intervalId = window.setInterval(() => {
        const increment = totalSize > 10 * 1024 * 1024 ? Math.random() * 3 : Math.random() * 5;
        simulatedProgress += increment;
        if (simulatedProgress > 95) simulatedProgress = 95;

        const uploadedMb = ((simulatedProgress / 100) * totalSize / (1024 * 1024)).toFixed(2);
        const elapsed = (Date.now() - startedAt) / 1000;
        let etaText = "";

        if (elapsed > 0 && simulatedProgress > 0) {
          const estimatedTotal = (elapsed / simulatedProgress) * 100;
          const remaining = Math.max(0, estimatedTotal - elapsed);
          const etaMin = Math.floor(remaining / 60);
          const etaSec = Math.round(remaining % 60);
          etaText = etaMin > 0 ? `ETA: ~${etaMin}m ${etaSec}s` : `ETA: ~${etaSec}s`;
        }

        setUploadProgress({
          visible: true,
          value: simulatedProgress,
          percentage: `${Math.round(simulatedProgress)}%`,
          statusText: "Uploading to GitHub...",
          detailsText: `${uploadedMb}MB / ${totalMb}MB`,
          etaText,
          isError: false,
        });
      }, 400);
    });

    xhr.addEventListener("load", () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        let response = {};
        try {
          response = JSON.parse(xhr.responseText || "{}");
        } catch (_error) {
          response = {};
        }

        setUploadProgress({
          visible: true,
          value: 100,
          percentage: "100%",
          statusText: "Upload Complete!",
          detailsText: `${totalMb}MB / ${totalMb}MB`,
          etaText: "",
          isError: false,
        });

        window.setTimeout(() => {
          const fileName = response.wallpaper?.filename;
          if (fileName) {
            navigate(`/wallpaper/${fileName}`);
          } else {
            navigate("/");
          }
        }, 1500);

        return;
      }

      let message = "Upload failed. Please try again.";
      try {
        const response = JSON.parse(xhr.responseText || "{}");
        if (response.message) message = response.message;
      } catch (_error) {
        // No-op
      }

      if (xhr.status === 401) {
        message = "Your login session has expired. Please log in again before uploading.";
        if (onLogout) onLogout();
      }

      setUploadProgress({
        visible: true,
        value: 0,
        percentage: "0%",
        statusText: "Upload Failed",
        detailsText: "Error",
        etaText: "",
        isError: true,
      });
      setStatus("error", message);
      setIsUploading(false);
    });

    xhr.addEventListener("error", () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      setUploadProgress({
        visible: true,
        value: 0,
        percentage: "0%",
        statusText: "Upload Error",
        detailsText: "Network error",
        etaText: "",
        isError: true,
      });
      setStatus("error", "An error occurred during upload. Please try again.");
      setIsUploading(false);
    });

    xhr.open("POST", getApiUrl("/api/wallpapers"));
    xhr.setRequestHeader("Authorization", `Bearer ${uploadSession.token}`);
    xhr.send(formData);
  }

  const statusStyle = getStatusStyle();

  return (
    <section className="wh-upload-page text-light">
      <div className="wh-upload-card">
        <h1 className="wh-form-title">
          <i className="fas fa-cloud-upload-alt me-2" />Upload Wallpaper
        </h1>

        <div
          style={{
            background: "rgba(76, 175, 80, 0.15)",
            border: "1px solid rgba(76, 175, 80, 0.3)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 25,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <i className="fas fa-info-circle" style={{ color: "#4CAF50", fontSize: 20, marginTop: 2 }} />
            <div>
              <h5 style={{ color: "#4CAF50", fontWeight: 600, marginBottom: 10 }}>
                Thanks for contributing to our wallpaper collection!
              </h5>
              <p style={{ color: "#A3A3A3", fontSize: 14, marginBottom: 12 }}>
                Please review our community rules and remember that all uploads are moderated.
                Adding tags and a caption to your uploads will help other users find your content easily.
              </p>
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderLeft: "3px solid #4CAF50",
                  padding: 12,
                  borderRadius: 4,
                }}
              >
                <p style={{ color: "#E3E3E3", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Remember:</p>
                <ul style={{ color: "#A3A3A3", fontSize: 13, marginBottom: 0, paddingLeft: 20 }}>
                  <li>No selfies or personal photos</li>
                  <li>No screenshots</li>
                  <li>No offensive images</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {previewUrl ? (
          <img src={previewUrl} className="wh-preview show" alt="Preview" />
        ) : null}

        {validationProgress.visible ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ffc107" }}>
                <i className="fas fa-spinner fa-spin me-2" />Checking image dimensions...
              </span>
              <span style={{ fontSize: 12, color: "#888" }}>{validationProgress.value}%</span>
            </div>
            <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3 }}>
              <div
                style={{
                  width: `${validationProgress.value}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #ffc107, #ff9800)",
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        ) : null}

        {validationStatus.visible ? (
          <div
            style={{
              padding: "12px 15px",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: statusStyle.background,
              borderLeft: statusStyle.borderLeft,
              color: statusStyle.color,
            }}
          >
            <i className={statusStyle.icon} />
            <span>{validationStatus.text}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div
            className={`wh-upload-area ${selectedFile ? "has-file" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("drag-over");
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("drag-over");
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove("drag-over");
              handleDrop(e);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4"
              onChange={(e) => handleFileSelection(e.target.files?.[0])}
              required
              style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }}
            />
            <div className="wh-upload-icon">
              <i className="fas fa-image" />
            </div>
            <div className="wh-upload-text">Drag & Drop or Click to Browse</div>
            <div className="wh-upload-hint">Supported: JPG, PNG, WEBP, MP4 (Images max 8MB, videos max 17MB)</div>
            <div className={`wh-selected-file ${selectedFile ? "show" : ""}`}>
              <i className="fas fa-check-circle me-2" />
              <span>{selectedFile?.name || ""}</span>
            </div>
          </div>

          <div className="mb-3">
            <label className="wh-form-label">
              <i className="fas fa-signature me-2" />Wallpaper Name
            </label>
            <input
              type="text"
              className="form-control"
              maxLength={100}
              placeholder="Enter wallpaper name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="wh-form-label">
              <i className="fas fa-tags me-2" />Categories
              <button
                type="button"
                className="btn btn-sm btn-link"
                style={{ padding: 0, marginLeft: 10, fontSize: 12, color: "#ffc107" }}
                onClick={async () => {
                  setRefreshingCategories(true);
                  await loadCategories();
                  window.setTimeout(() => setRefreshingCategories(false), 500);
                }}
              >
                <i className={`fas ${refreshingCategories ? "fa-spinner fa-spin" : "fa-sync-alt"}`} /> {refreshingCategories ? "Loading..." : "Refresh"}
              </button>
            </label>
            <small style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 10 }}>
              <i className="fas fa-info-circle me-1" />
              Click parent category to expand and view subcategories. Select any category to organize your wallpaper.
            </small>

            <div className="wh-categories-checkboxes">
              {categories.length === 0 ? (
                <p style={{ color: "#999", fontSize: 14, margin: 0 }}>No categories available</p>
              ) : (
                categories.map((category) => {
                  const children = category.children || [];
                  const hasChildren = children.length > 0;
                  const expanded = Boolean(expandedParents[category.id]);

                  if (!hasChildren) {
                    return (
                      <div key={category.id} className="wh-category-parent">
                        <div className="wh-category-checkbox">
                          <input
                            type="checkbox"
                            id={`category_${category.id}`}
                            checked={selectedCategoryIds.includes(category.id)}
                            onChange={(e) => toggleSimpleCategory(category.id, e.target.checked)}
                          />
                          <label htmlFor={`category_${category.id}`}>
                            <i className="fas fa-folder me-1" /> {category.name}
                          </label>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={category.id} className="wh-category-parent">
                      <div
                        className="wh-category-parent-header"
                        onClick={() => {
                          setExpandedParents((prev) => ({
                            ...prev,
                            [category.id]: !prev[category.id],
                          }));
                        }}
                      >
                        <i className={`fas fa-chevron-right wh-toggle-icon ${expanded ? "expanded" : ""}`} />
                        <input
                          type="checkbox"
                          id={`category_${category.id}`}
                          checked={selectedCategoryIds.includes(category.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => toggleParentCategory(category.id, e.target.checked)}
                        />
                        <label htmlFor={`category_${category.id}`} onClick={(e) => e.stopPropagation()}>
                          <i className="fas fa-folder me-1" /> {category.name}
                        </label>
                      </div>

                      <div className={`wh-category-children ${expanded ? "show" : ""}`}>
                        {children.map((child) => (
                          <div className="wh-category-checkbox" key={child.id} style={{ marginBottom: 8 }}>
                            <input
                              type="checkbox"
                              id={`category_${child.id}`}
                              checked={selectedCategoryIds.includes(child.id)}
                              onChange={(e) => toggleChildCategory(category.id, child.id, e.target.checked)}
                            />
                            <label htmlFor={`category_${child.id}`}>
                              <i className="fas fa-tag me-1" /> {child.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mb-3">
            <label className="wh-form-label">
              <i className="fas fa-align-left me-2" />Description
            </label>
            <textarea
              className="form-control"
              rows={4}
              maxLength={1000}
              placeholder="Describe this wallpaper..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {uploadProgress.visible ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#ffc107" }}>
                  <i className="fas fa-spinner fa-spin me-2" />
                  <span>{uploadProgress.statusText}</span>
                </span>
                <span style={{ fontSize: 13, color: "#888" }}>{uploadProgress.percentage}</span>
              </div>
              <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 5 }}>
                <div
                  style={{
                    width: `${uploadProgress.value}%`,
                    height: "100%",
                    borderRadius: 5,
                    background: uploadProgress.isError
                      ? "#f44336"
                      : "linear-gradient(90deg, #ffc107, #ff9800)",
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span>{uploadProgress.detailsText}</span>
                <span>{uploadProgress.etaText}</span>
              </div>
            </div>
          ) : null}

          <div className="wh-btn-container">
            <button className="wh-upload-btn" type="submit" disabled={isUploading}>
              <i className={`fas ${isUploading ? "fa-spinner fa-spin" : "fa-upload"} me-2`} />
              {isUploading ? "Uploading..." : "Upload Wallpaper"}
            </button>
            <Link to="/" className="wh-cancel-btn">
              <i className="fas fa-times me-2" />Cancel
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

export default UploadPage;
