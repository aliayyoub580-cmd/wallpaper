import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, getApiUrl } from "../api";
import WallpaperArtwork from "../components/WallpaperArtwork";
import { loadWallpaperCatalog } from "../lib/wallpaperCatalog";

const heroSlides = [
  "/images/Hero.jpg",
  "/images/Dark shadow.jpg",
  "/images/Goku ultran instant.jpg",
  "/images/Hunter x Hunter-Aesthetic.jpg",
  "/images/Jin woo Desktop Wallpaper.jpg",
  "/images/jin woo vs Beru.png",
  "/images/JJK Nanami wallpapers.jpg",
  "/images/Naruto Baryon Mood.jpg",
];

function flattenCategories(categories) {
  return categories.flatMap((category) => [category, ...(category.children || [])]);
}

function mapWallpaper(wallpaper) {
  return {
    id: wallpaper.id,
    filename: wallpaper.filename || wallpaper.id,
    name: wallpaper.name || wallpaper.title || wallpaper.filename || "Wallpaper",
    description: wallpaper.description || "",
    views: wallpaper.views || 0,
    likes: wallpaper.likes || wallpaper.likesCount || 0,
    downloads: wallpaper.downloads || 0,
    user_liked: Boolean(wallpaper.user_liked),
    categories: wallpaper.categories || [],
    github_url: wallpaper.github_url || wallpaper.originalUrl || wallpaper.imageUrl || wallpaper.image_url,
    imageUrl: wallpaper.imageUrl || wallpaper.thumbnailUrl || wallpaper.previewUrl || wallpaper.image_url || wallpaper.github_url,
    thumbnailUrl: wallpaper.thumbnailUrl || wallpaper.thumbnail_url || wallpaper.thumb_url,
    previewUrl: wallpaper.previewUrl || wallpaper.preview_url || wallpaper.medium_url,
    originalUrl: wallpaper.originalUrl || wallpaper.original_url || wallpaper.github_url,
    blurDataURL: wallpaper.blurDataURL || wallpaper.blur_data_url,
    aspectRatio: wallpaper.aspectRatio || "",
    srcSet: wallpaper.srcSet || "",
    sizes: wallpaper.sizes || "",
    width: wallpaper.width || wallpaper.originalWidth || 0,
    height: wallpaper.height || wallpaper.originalHeight || 0,
    mime: wallpaper.mime || "image/jpeg",
    created_at: wallpaper.created_at || wallpaper.createdAt,
  };
}

function categoryLabel(wallpaper) {
  if (!wallpaper.categories?.length) return "Uncategorized";

  return wallpaper.categories
    .map((category) => {
      if (category.parent_name) return `${category.parent_name} (${category.name})`;
      return category.name;
    })
    .filter(Boolean)
    .join(", ");
}

function HomePage({ session, onLogout }) {
  const { slug } = useParams();
  const [allWallpapers, setAllWallpapers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [mainSearch, setMainSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("latest");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % heroSlides.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [wallpaperData, categoryData] = await Promise.all([
          loadWallpaperCatalog("/api/wallpapers?sort=latest"),
          apiRequest("/api/categories"),
        ]);

        setAllWallpapers((wallpaperData || []).map(mapWallpaper));
        setCategories(categoryData || []);
      } catch (err) {
        setError(err.message || "Unable to load wallpapers.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const allCategories = useMemo(() => flattenCategories(categories), [categories]);
  const popularCategories = useMemo(() => categories.slice(0, 8), [categories]);

  useEffect(() => {
    if (!slug) {
      setCategoryFilter("");
      return;
    }

    if (allCategories.length === 0) return;

    const matched = allCategories.find((category) => category.slug === slug);
    setCategoryFilter(matched ? String(matched.id) : "");
  }, [allCategories, slug]);

  const activeCategory = useMemo(
    () => allCategories.find((category) => String(category.id) === String(categoryFilter)),
    [allCategories, categoryFilter]
  );

  const filteredWallpapers = useMemo(() => {
    let data = [...allWallpapers];

    if (deferredSearchQuery.trim()) {
      const term = deferredSearchQuery.toLowerCase();
      data = data.filter((wallpaper) => {
        const categoryText = (wallpaper.categories || [])
          .map((category) => `${category.name || ""} ${category.slug || ""}`.toLowerCase())
          .join(" ");

        return (
          (wallpaper.name || "").toLowerCase().includes(term) ||
          (wallpaper.description || "").toLowerCase().includes(term) ||
          categoryText.includes(term)
        );
      });
    }

    if (categoryFilter) {
      data = data.filter((wallpaper) =>
        (wallpaper.categories || []).some((category) => String(category.id) === String(categoryFilter))
      );
    }

    switch (sortFilter) {
      case "popular":
        data.sort((a, b) => b.views + b.likes * 2 - (a.views + a.likes * 2));
        break;
      case "views":
        data.sort((a, b) => b.views - a.views);
        break;
      case "likes":
        data.sort((a, b) => b.likes - a.likes);
        break;
      default:
        data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
    }

    return data;
  }, [allWallpapers, deferredSearchQuery, categoryFilter, sortFilter]);

  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(filteredWallpapers.length / pageSize));
  const pagedWallpapers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWallpapers.slice(start, start + pageSize);
  }, [filteredWallpapers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, sortFilter]);

  function performSearch() {
    setSearchQuery(mainSearch.trim());
  }

  function clearSearch() {
    setMainSearch("");
    setSearchQuery("");
  }

  async function handleLike(id) {
    if (!session?.token) {
      window.alert("Please login to like wallpapers");
      return;
    }

    try {
      const result = await apiRequest(`/api/wallpapers/${id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });

      setAllWallpapers((prev) =>
        prev.map((wallpaper) =>
          wallpaper.id === id
            ? { ...wallpaper, likes: result.likes, user_liked: result.liked }
            : wallpaper
        )
      );
    } catch (err) {
      window.alert(err.message || "Failed to like wallpaper.");
    }
  }

  function handleCategorySelect(category) {
    setCategoryFilter(category ? String(category.id) : "");
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark fixed-top">
        <div className="container-fluid">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <img src="/images/logo.png" alt="Logo" height="35" />
          </Link>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  <i className="fa-solid fa-clock me-2" />Latest
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/trending">
                  <i className="fa-solid fa-fire me-2" />Trending
                </Link>
              </li>
              <li className="nav-item">
                <button className="nav-link btn btn-link" type="button" data-bs-toggle="modal" data-bs-target="#categoriesModal">
                  <i className="fa-solid fa-layer-group me-2" />Categories
                </button>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/upload">
                  <i className="fa-solid fa-cloud-arrow-up me-2" />Upload
                </Link>
              </li>
            </ul>

            {!session?.user ? (
              <>
                <Link to="/login" className="btn btn-auth btn-outline-light me-2">
                  <i className="fa-solid fa-right-to-bracket me-2" />Sign In
                </Link>
                <Link to="/register" className="btn btn-auth btn-warning">
                  <i className="fa-solid fa-user-plus me-2" />Create Account
                </Link>
              </>
            ) : (
              <div className="d-flex align-items-center flex-wrap gap-2">
                <Link to="/notifications" className="btn btn-outline-warning position-relative">
                  <i className="fa-solid fa-bell" />
                </Link>
                <Link to="/my-account" className="btn btn-auth btn-outline-light">
                  <i className="fa-solid fa-user me-2" />My Account
                </Link>
                <button type="button" className="btn btn-auth btn-outline-light" onClick={onLogout}>
                  <i className="fa-solid fa-sign-out-alt me-2" />Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-carousel">
          <div className="carousel-track">
            {heroSlides.map((slide, index) => {
              const isActive = index === carouselIndex;
              const wasPrevious = index === (carouselIndex - 1 + heroSlides.length) % heroSlides.length;
              return (
                <div
                  key={slide}
                  className={`carousel-slide${isActive ? " active" : ""}${wasPrevious ? " exiting" : ""}`}
                  style={{ backgroundImage: `url('${slide}')` }}
                />
              );
            })}
          </div>
        </div>

        <div className="hero-content">
          <h1 className="fw-bold mb-4">Discover Amazing Wallpapers</h1>
          <div className="input-group hero-search">
            <input
              type="text"
              className="form-control"
              placeholder="Search for stunning wallpapers..."
              value={mainSearch}
              onChange={(event) => setMainSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") performSearch();
              }}
            />
            <button className="btn" onClick={performSearch}>
              <i className="fa-solid fa-search me-2" />Search
            </button>
          </div>

          <div className="filter-bar">
            <select
              className="form-select wh-filter-select"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">All Categories</option>
              {popularCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              className="form-select wh-filter-select"
              value={sortFilter}
              onChange={(event) => setSortFilter(event.target.value)}
            >
              <option value="latest">Latest</option>
              <option value="popular">Most Popular</option>
              <option value="views">Most Viewed</option>
              <option value="likes">Most Liked</option>
            </select>
          </div>
        </div>
      </section>

      <section className="trending-section text-light text-center" id="categories">
        <div className="container">
          <h2 className="mb-2">Browse by Category</h2>
          <p className="subtitle mb-4">Explore wallpapers by category</p>
          <div className="d-flex flex-wrap justify-content-center gap-3">
            {popularCategories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className={`btn btn-sm ${String(categoryFilter) === String(category.id) ? "active" : ""}`}
                onClick={() => handleCategorySelect(category)}
              >
                {category.icon || <i className="fa-solid fa-folder me-1" />} {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-section text-light text-center" id="featured">
        <div className="container">
          <h2>{activeCategory ? `${activeCategory.name} Wallpapers` : "Featured Desktop Wallpapers"}</h2>
          <p className="subtitle">
            {activeCategory
              ? `Explore beautiful ${activeCategory.name.toLowerCase()} wallpapers`
              : "Handpicked 4K wallpapers updated daily"}
          </p>

          {searchQuery ? (
            <div className="wh-search-results-header">
              <h3>
                <i className="fa-solid fa-magnifying-glass me-2" />Search Results for:
                <span> {searchQuery}</span>
              </h3>
              <button className="btn btn-outline-warning btn-sm" onClick={clearSearch}>
                <i className="fa-solid fa-times me-2" />Clear Search
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="skeleton-grid" style={{ display: "grid" }}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div className="skeleton-card" key={index} style={{ display: "block" }}>
                  <div className="skeleton skeleton-image" />
                  <div className="skeleton skeleton-title" />
                  <div className="skeleton skeleton-text" />
                </div>
              ))}
            </div>
          ) : null}

          {!loading && error ? <p className="text-danger">{error}</p> : null}

          <div className="row g-4">
            {!loading && pagedWallpapers.length === 0 ? (
              <div className="col-12 text-center py-5">
                <h4 className="text-warning">No wallpapers found</h4>
                <p className="text-muted">Try a different search term</p>
              </div>
            ) : null}

            {!loading &&
              pagedWallpapers.map((wallpaper, index) => {
                const isVideo = String(wallpaper.mime || "").startsWith("video/");
                return (
                  <div key={wallpaper.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                    <div className="wallpaper-card-wrapper">
                      <Link to={`/wallpaper/${encodeURIComponent(wallpaper.filename)}`} className="text-decoration-none">
                        <div className="wallpaper-card" style={{ position: "relative" }}>
                          <WallpaperArtwork
                            wallpaper={wallpaper}
                            alt={wallpaper.name}
                            priority={currentPage === 1 && index < 4}
                            className="wallpaper-media-shell"
                            mediaClassName="wallpaper-media"
                            autoPlayVideo={false}
                            loopVideo={false}
                            mutedVideo
                          />
                          <div className="wallpaper-card-overlay">
                            <div className="wallpaper-card-info">
                              <div className="wallpaper-card-title">{wallpaper.name}</div>
                              <span className="wallpaper-card-category">
                                {categoryLabel(wallpaper)}
                                {isVideo ? " - Video" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="wallpaper-stats">
                        <a className="download-btn" href={getApiUrl(`/api/wallpapers/download/${encodeURIComponent(wallpaper.filename)}/original`)}>
                          <i className="fas fa-download" /> Download
                        </a>
                        <button
                          className={`like-btn ${wallpaper.user_liked ? "liked" : ""}`}
                          onClick={(event) => {
                            event.preventDefault();
                            handleLike(wallpaper.id);
                          }}
                        >
                          <i className="fas fa-heart" /> <span className="like-count">{wallpaper.likes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="pagination-container">
            <button className="btn" id="prevBtn" disabled={currentPage <= 1} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}>
              <i className="fas fa-chevron-left me-2" />Previous
            </button>
            <span id="pageIndicator">Page {currentPage} of {totalPages}</span>
            <button
              className="btn"
              id="nextBtn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next<i className="fas fa-chevron-right ms-2" />
            </button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="row gy-5 align-items-start">
            <div className="col-lg-3 col-md-6">
              <div className="footer-brand">
                <h4 className="fw-bold mb-3">WallpaperCave</h4>
                <p className="footer-description">
                  Explore, download, and share high-quality wallpapers. Your ultimate destination for HD, 4K, and aesthetic visuals - updated daily.
                </p>
                <div className="contact-info mt-4">
                  <p className="footer-contact-item">
                    <i className="fas fa-envelope me-2" style={{ color: "#F1C40F" }} />
                    <span>support@wallpapercave.com</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-2 col-md-6">
              <h6 className="footer-heading mb-4">Quick Links</h6>
              <ul className="list-unstyled footer-links">
                <li><Link to="/" className="footer-link">Latest</Link></li>
                <li><a href="mailto:support@wallpapercave.com" className="footer-link">Contact Us</a></li>
                <li><Link to="/privacy-policy" className="footer-link">Privacy Policy</Link></li>
              </ul>
            </div>

            <div className="col-lg-2 col-md-6">
              <h6 className="footer-heading mb-4">Categories</h6>
              <ul className="list-unstyled footer-links">
                {popularCategories.slice(0, 3).map((category) => (
                  <li key={category.id}>
                    <Link to={`/category/${category.slug}`} className="footer-link">{category.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-lg-3 col-md-6">
              <h6 className="footer-heading mb-4">Follow Us</h6>
              <div className="social-icons">
                <a href="#" className="social-icon" title="Facebook"><i className="fab fa-facebook-f" /></a>
                <a href="#" className="social-icon" title="Twitter"><i className="fab fa-x-twitter" /></a>
                <a href="#" className="social-icon" title="Instagram"><i className="fab fa-instagram" /></a>
                <a href="#" className="social-icon" title="Pinterest"><i className="fab fa-pinterest" /></a>
                <a href="#" className="social-icon" title="YouTube"><i className="fab fa-youtube" /></a>
              </div>
            </div>
          </div>

          <div className="footer-divider" />

          <div className="footer-bottom">
            <p className="footer-copyright">&copy; 2025 <span className="brand-name">WallpaperCave</span>. All rights reserved.</p>
            <p className="footer-credit">Designed with <span className="heart">Love</span> by <span className="creator">Atif Ayyoub</span></p>
          </div>
        </div>
      </footer>

      <div className="modal fade" id="categoriesModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content wh-categories-modal">
            <div className="modal-header border-0 pb-2">
              <div>
                <h5 className="modal-title">
                  <i className="fas fa-layer-group" />Explore Categories
                </h5>
                <p>Discover wallpapers organized by theme</p>
              </div>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div id="categoriesList" className="wh-categories-grid">
                {categories.length === 0 ? (
                  <div className="wh-categories-empty">
                    <i className="fas fa-inbox" />
                    <p>No categories available yet</p>
                  </div>
                ) : (
                  categories.map((category) => {
                    const children = category.children || [];
                    const isOpen = Boolean(expandedCategories[category.id]);

                    return (
                      <div key={category.id} className="category-card wh-category-card">
                        <div className="wh-category-card-glow" />
                        <div className="wh-category-main-row">
                          <Link
                            to={`/category/${category.slug}`}
                            data-bs-dismiss="modal"
                            className="wh-category-link"
                            onClick={() => handleCategorySelect(category)}
                          >
                            <span className="wh-category-icon">{category.icon || <i className="fas fa-folder" />}</span>
                            <span>
                              <strong>{category.name}</strong>
                              <em>{category.total_wallpapers_count || category.wallpapers_count || 0}</em>
                            </span>
                          </Link>

                          {children.length > 0 ? (
                            <button
                              type="button"
                              className="wh-category-expand"
                              onClick={() => setExpandedCategories((prev) => ({ ...prev, [category.id]: !prev[category.id] }))}
                            >
                              <i className={`fas fa-chevron-down ${isOpen ? "open" : ""}`} />
                            </button>
                          ) : null}
                        </div>

                        {children.length > 0 ? (
                          <div className={`wh-category-children-list ${isOpen ? "show" : ""}`}>
                            {children.map((child) => (
                              <Link
                                key={child.id}
                                to={`/category/${child.slug}`}
                                data-bs-dismiss="modal"
                                onClick={() => handleCategorySelect(child)}
                              >
                                <span>{child.icon || <i className="fas fa-tag" />} {child.name}</span>
                                <em>{child.wallpapers_count || 0}</em>
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default HomePage;
