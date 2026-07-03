import { NavLink, useNavigate } from "react-router-dom";
import { canAccess, getStoredUser, roleLabels } from "../../utils/access.js";

const navItems = [
  ["Дашборд", "/dashboard", "bi-grid-1x2", "dashboard"],
  ["Запросы", "/requests", "bi-file-text", "requests"],
  ["Кандидаты", "/candidates", "bi-people", "candidates"],
  ["Сравнение", "/comparison", "bi-bar-chart", "comparison"],
  ["Справочник", "/dictionary", "bi-book", "dictionary"],
  ["Пользователи", "/users", "bi-person-gear", "users"],
  ["Правила оценки", "/rules", "bi-sliders", "rules"],
];

export function AppLayout({ children }) {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const displayUser = {
    fullName: storedUser?.name || storedUser?.login || "Пользователь",
    role: storedUser?.role || "account_manager",
  };

  const logout = () => {
    window.localStorage.removeItem("talentmatch_token");
    window.localStorage.removeItem("talentmatch_user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">HR</span>
          <span>TalentMatch</span>
        </div>
        <nav className="nav">
          {navItems.filter(([, , , scope]) => canAccess(scope, displayUser.role)).map(([label, to, icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <i className={`bi ${icon}`} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <b>Рабочее пространство</b>
            <span>Подбор специалистов по требованиям заказчика</span>
          </div>
          <div className="user-chip">
            <span>{displayUser.fullName} · {roleLabels[displayUser.role] || displayUser.role}</span>
            <button type="button" className="logout-button" onClick={logout}>
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              Выйти
            </button>
          </div>
        </header>
        <div className="page">{children}</div>
      </main>
    </div>
  );
}

