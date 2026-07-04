import { Navigate, useLocation } from "react-router-dom";
import { EmptyState } from "../ui/Table.jsx";
import { canAccess, defaultPathForRole, getStoredUser } from "../../utils/access.js";

export function ProtectedRoute({ scope, children }) {
  const location = useLocation();
  const token = window.localStorage.getItem("talentmatch_token");
  const user = getStoredUser();

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (scope && !canAccess(scope, user?.role)) {
    return (
      <EmptyState
        title="Недостаточно прав"
        text={`Раздел недоступен для текущей роли. Вернитесь на доступную страницу: ${defaultPathForRole(user?.role)}.`}
      />
    );
  }

  return children;
}

