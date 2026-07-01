import { Badge } from "../../components/ui/Badge.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";

const roleLabels = {
  account_manager: "Аккаунт-менеджер",
  admin: "Администратор",
  leader: "Руководитель",
  lead: "Руководитель",
};

const getStoredUser = () => JSON.parse(window.localStorage.getItem("talentmatch_user") || "null");

export function UsersPage() {
  const currentUser = getStoredUser();

  if (currentUser?.role !== "admin") {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Пользователи</h1>
            <p>Раздел доступен только администратору</p>
          </div>
        </div>
        <Card>
          <EmptyState title="Недостаточно прав" text="Управление пользователями доступно только роли Администратор." />
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Пользователи</h1>
          <p>Панель администратора для управления пользователями системы</p>
        </div>
      </div>
      <Card>
        <div className="alert warning">Управление пользователями пока недоступно.</div>
        {currentUser ? (
          <DataTable>
            <thead><tr><th>Логин</th><th>Роль</th><th>Дата создания</th><th>Действия</th></tr></thead>
            <tbody>
              <tr>
                <td className="entity-name">{currentUser.login || "—"}</td>
                <td><Badge>{roleLabels[currentUser.role] || currentUser.role}</Badge></td>
                <td>—</td>
                <td>TODO: подключить GET/POST/PATCH/DELETE users после появления в OpenAPI.</td>
              </tr>
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="Пользователи недоступны" text="Раздел будет доступен после подключения управления пользователями." />
        )}
      </Card>
    </>
  );
}


