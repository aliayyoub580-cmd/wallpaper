import { Link, NavLink } from "react-router-dom";

function Header({ user, onLogout }) {
  const userName = user?.user_metadata?.name || user?.name || user?.email || "My Account";

  return (
    <nav className="navbar navbar-expand-lg navbar-dark fixed-top">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <img src="/images/logo.png" alt="Logo" height="35" />
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink className="nav-link" to="/" end>
                <i className="fa-solid fa-clock me-2" />Latest
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/trending">
                <i className="fa-solid fa-fire me-2" />Trending
              </NavLink>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/#categories">
                <i className="fa-solid fa-layer-group me-2" />Categories
              </Link>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/upload">
                <i className="fa-solid fa-cloud-arrow-up me-2" />Upload
              </NavLink>
            </li>
          </ul>

          {user ? (
            <div className="d-flex align-items-center flex-wrap gap-2">
              <Link to="/notifications" className="btn btn-outline-warning position-relative">
                <i className="fa-solid fa-bell" />
              </Link>
              <Link to="/my-account" className="btn btn-auth btn-outline-light">
                <i className="fa-solid fa-user me-2" />{userName}
              </Link>
              <button type="button" onClick={onLogout} className="btn btn-outline-danger">
                <i className="fa-solid fa-right-from-bracket" />
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-auth btn-outline-light me-2">
                <i className="fa-solid fa-right-to-bracket me-2" />Sign In
              </Link>
              <Link to="/register" className="btn btn-auth btn-warning">
                <i className="fa-solid fa-user-plus me-2" />Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Header;
