import { NavLink } from "react-router-dom";
import { useMockApi } from "../../services/mockApi.js";

const navItems = [
  ["Дашборд", "/dashboard", "bi-grid-1x2"],
  ["Запросы", "/requests", "bi-file-text"],
  ["Кандидаты", "/candidates", "bi-people"],
  ["Сравнение", "/comparison", "bi-bar-chart"],
  ["Справочник", "/dictionary", "bi-book"],
  ["Пользователи", "/users", "bi-person-gear"],
];

export function AppLayout({ children }) {
  const { user, loading, error } = useMockApi();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">HR</span>
          <span>TalentMatch</span>
        </div>
        <nav className="nav">
          {navItems.map(([label, to, icon]) => (
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
            <span>Mock-режим, данные хранятся в памяти</span>
          </div>
          <div className="user-chip">
            <span>{user.fullName}</span>
            <span className="avatar">{user.initials}</span>
          </div>
        </header>
        {loading ? <div className="loading-line">Обновляем mock-данные...</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
