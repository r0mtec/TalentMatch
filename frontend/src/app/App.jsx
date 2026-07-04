import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { ToastProvider } from "../components/ui/Toast.jsx";
import { getCurrentUser } from "../services/authApi.js";

export function App() {
  const location = useLocation();
  const token = window.localStorage.getItem("talentmatch_token");
  const [authChecked, setAuthChecked] = useState(!token);
  const [authenticated, setAuthenticated] = useState(Boolean(token && window.localStorage.getItem("talentmatch_user")));

  useEffect(() => {
    if (!token) {
      setAuthenticated(false);
      setAuthChecked(true);
      return;
    }

    let ignore = false;
    getCurrentUser()
      .then(() => {
        if (!ignore) setAuthenticated(true);
      })
      .catch(() => {
        window.localStorage.removeItem("talentmatch_token");
        window.localStorage.removeItem("talentmatch_user");
        if (!ignore) setAuthenticated(false);
      })
      .finally(() => {
        if (!ignore) setAuthChecked(true);
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  if (!token || (authChecked && !authenticated)) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!authChecked) {
    return <div className="loading-line inline">Проверяем сессию...</div>;
  }

  return (
    <ToastProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ToastProvider>
  );
}
