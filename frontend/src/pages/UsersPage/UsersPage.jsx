import { useState } from "react";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Select } from "../../components/ui/Form.jsx";
import { DataTable } from "../../components/ui/Table.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { useMockApi } from "../../services/mockApi.js";
import { formatDate } from "../../utils/formatters.js";

const roleLabels = {
  account_manager: "Аккаунт-менеджер",
  admin: "Администратор",
  leader: "Руководитель",
};

export function UsersPage() {
  const { users, updateUserRole, loading } = useMockApi();
  const { notify } = useToast();
  const [roles, setRoles] = useState({});

  const saveRole = async (user) => {
    await updateUserRole(user.id, roles[user.id] || user.role);
    notify("Роль пользователя обновлена.");
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Пользователи</h1>
          <p>Mock-раздел администратора для управления ролями системы</p>
        </div>
      </div>
      <Card>
        <DataTable>
          <thead><tr><th>Имя</th><th>Логин</th><th>Роль</th><th>Дата создания</th><th>Действия</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="entity-name">{user.fullName}</td>
                <td>{user.login}</td>
                <td><Badge>{roleLabels[user.role]}</Badge></td>
                <td>{formatDate(user.created_at)}</td>
                <td className="table-actions">
                  <Select value={roles[user.id] || user.role} onChange={(event) => setRoles({ ...roles, [user.id]: event.target.value })}>
                    {Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
                  </Select>
                  <Button variant="secondary" icon="bi-check2" disabled={loading} onClick={() => saveRole(user)}>Сохранить роль</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Card>
    </>
  );
}
