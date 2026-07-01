import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { ToastProvider } from "../components/ui/Toast.jsx";
import { MockDataProvider } from "../services/mockApi.js";

export function App() {
  const location = useLocation();
  const user = window.localStorage.getItem("talentmatch_user");
  const token = window.localStorage.getItem("talentmatch_token");

  if (!user && !token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <ToastProvider>
      <MockDataProvider>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </MockDataProvider>
    </ToastProvider>
  );
}
