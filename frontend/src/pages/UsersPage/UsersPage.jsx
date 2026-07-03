import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input, Select } from "../../components/ui/Form.jsx";
import { ConfirmModal, Modal } from "../../components/ui/Modal.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { createUser, deleteUser, getUsers, updateUser } from "../../services/usersApi.js";
import { formatDate } from "../../utils/formatters.js";

const roleLabels = {
  account_manager: "Аккаунт-менеджер",
  admin: "Администратор",
  leader: "Руководитель",
  lead: "Руководитель",
};

const roleOptions = [
  { value: "account_manager", label: "Аккаунт-менеджер" },
  { value: "lead", label: "Руководитель" },
  { value: "admin", label: "Администратор" },
];

const blank = { login: "", password: "", role: "account_manager" };

const getStoredUser = () => {
  try {
    return JSON.parse(window.localStorage.getItem("talentmatch_user") || "null");
  } catch {
    return null;
  }
};

const formatUserDate = (date) => (date ? formatDate(date) : "—");

export function UsersPage() {
  const { notify } = useToast();
  const currentUser = getStoredUser();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [formErrors, setFormErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setApiError("");
    try {
      const result = await getUsers({ per_page: 100 });
      setUsers(result.items);
    } catch (caught) {
      setApiError(caught.message || "Не удалось загрузить пользователей.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") loadUsers();
  }, [currentUser?.role]);

  const filteredUsers = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return users;
    return users.filter((user) => `${user.login} ${roleLabels[user.role] || user.role}`.toLowerCase().includes(text));
  }, [query, users]);

  const openCreate = () => {
    setForm(blank);
    setFormErrors({});
    setModal(true);
  };

  const openEdit = (user) => {
    setForm({ ...user, password: "" });
    setFormErrors({});
    setModal(true);
  };

  const validate = () => {
    const errors = {};
    if (!form.login.trim()) errors.login = "Укажите логин.";
    if (!form.id && !form.password.trim()) errors.password = "Укажите пароль.";
    if (!form.role) errors.role = "Выберите роль.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setApiError("");
    try {
      const payload = {
        login: form.login.trim(),
        role: form.role,
        password: form.password.trim(),
      };
      if (form.id) await updateUser(form.id, payload);
      else await createUser(payload);
      notify(form.id ? "Пользователь обновлён." : "Пользователь создан.");
      setModal(false);
      await loadUsers();
    } catch (caught) {
      setFormErrors(caught.errors || {});
      setApiError(caught.message || "Не удалось сохранить пользователя.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setSaving(true);
    setApiError("");
    try {
      await deleteUser(pendingDelete.id);
      notify("Пользователь удалён.");
      setPendingDelete(null);
      await loadUsers();
    } catch (caught) {
      setApiError(caught.message || "Не удалось удалить пользователя.");
    } finally {
      setSaving(false);
    }
  };

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
        <Button icon="bi-person-plus" onClick={openCreate}>Добавить пользователя</Button>
      </div>
      <Card>
        {apiError ? <div className="alert danger">{apiError}</div> : null}
        <div className="filters">
          <Input placeholder="Поиск по логину или роли" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        {loading ? <div className="loading-line inline">Загружаем пользователей...</div> : null}
        {!loading && filteredUsers.length ? (
          <DataTable>
            <thead><tr><th>Логин</th><th>Роль</th><th>Дата создания</th><th>Действия</th></tr></thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id && currentUser?.id === user.id;
                return (
                  <tr key={user.id || user.login}>
                    <td className="entity-name">{user.login}</td>
                    <td><Badge>{roleLabels[user.role] || user.role}</Badge></td>
                    <td>{formatUserDate(user.createdAt)}</td>
                    <td className="table-actions">
                      <Button variant="secondary" icon="bi-pencil" onClick={() => openEdit(user)}>Редактировать</Button>
                      <Button
                        variant="danger"
                        icon="bi-trash3"
                        disabled={isCurrentUser}
                        onClick={() => setPendingDelete(user)}
                      >
                        Удалить
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : null}
        {!loading && !filteredUsers.length ? <EmptyState title="Пользователи не найдены" text="Измените поиск или добавьте нового пользователя." /> : null}
      </Card>
      {modal ? (
        <Modal title={form.id ? "Редактирование пользователя" : "Новый пользователь"} onClose={() => setModal(false)}>
          {apiError ? <div className="alert danger">{apiError}</div> : null}
          <Field label="Логин" error={formErrors.login}>
            <Input value={form.login} onChange={(event) => setForm({ ...form, login: event.target.value })} />
          </Field>
          <Field label={form.id ? "Новый пароль" : "Пароль"} error={formErrors.password}>
            <Input
              type="password"
              value={form.password}
              placeholder={form.id ? "Оставьте пустым, если менять не нужно" : ""}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </Field>
          <Field label="Роль" error={formErrors.role}>
            <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </Select>
          </Field>
          <div className="modal-actions">
            <Button variant="secondary" disabled={saving} onClick={() => setModal(false)}>Отмена</Button>
            <Button icon="bi-check2" disabled={saving} onClick={submit}>{saving ? "Сохраняем..." : "Сохранить"}</Button>
          </div>
        </Modal>
      ) : null}
      {pendingDelete ? (
        <ConfirmModal
          title="Удалить пользователя?"
          text={`Пользователь ${pendingDelete.login} будет удалён из системы.`}
          loading={saving}
          onCancel={() => setPendingDelete(null)}
          onConfirm={remove}
        />
      ) : null}
    </>
  );
}
