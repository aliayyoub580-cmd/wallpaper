import { Link } from "react-router-dom";

function ErrorPage({ code = "404", title = "Page Not Found", message = "The page you are looking for does not exist." }) {
  return (
    <main className="wh-error-page">
      <section className="wh-error-card">
        <div className="wh-error-code">{code}</div>
        <h1>{title}</h1>
        <p>{message}</p>
        <Link to="/" className="back-btn">
          <i className="fa-solid fa-arrow-left" /> Back to Home
        </Link>
      </section>
    </main>
  );
}

export default ErrorPage;
