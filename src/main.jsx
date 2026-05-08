import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./legacy/css/style.css";
import "./legacy/css/homepage.css";
import "./legacy/css/footer.css";
import "./legacy/css/categories.css";
import "./legacy/css/skeleton.css";
import "./legacy/css/admin.css";
import "./legacy/css/auth-upload.css";
import "./legacy/css/react-parity.css";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
