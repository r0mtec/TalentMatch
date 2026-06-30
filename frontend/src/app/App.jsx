import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { ToastProvider } from "../components/ui/Toast.jsx";
import { MockDataProvider } from "../services/mockApi.js";

export function App() {
  const location = useLocation();
  const user = window.localStorage.getItem("talentmatch_user");

  if (!user) {
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
