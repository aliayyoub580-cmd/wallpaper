import { Navigate } from "react-router-dom";

function AuthPage() {
  return <Navigate to="/login" replace />;
}

export default AuthPage;
