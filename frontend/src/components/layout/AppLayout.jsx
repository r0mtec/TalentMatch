import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  ["Дашборд", "/dashboard", "bi-grid-1x2"],
  ["Запросы", "/requests", "bi-file-text"],
  ["Кандидаты", "/candidates", "bi-people"],
  ["Сравнение", "/comparison", "bi-bar-chart"],
  ["Справочник", "/dictionary", "bi-book"],
  ["Пользователи", "/users", "bi-person-gear", "admin"],
];

export function AppLayout({ children }) {
  const navigate = useNavigate();
  const storedUser = JSON.parse(window.localStorage.getItem("talentmatch_user") || "null");
  const displayUser = {
    fullName: storedUser?.name || storedUser?.login || "Пользователь",
    initials: storedUser?.initials || String(storedUser?.login || "TM").slice(0, 2).toUpperCase(),
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
          {navItems.filter(([, , , role]) => !role || role === displayUser.role).map(([label, to, icon]) => (
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
            <span>Backend API подключён, fallback-разделы помечены явно</span>
          </div>
          <div className="user-chip">
            <span>{displayUser.fullName}</span>
            <span className="avatar">{displayUser.initials}</span>
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
