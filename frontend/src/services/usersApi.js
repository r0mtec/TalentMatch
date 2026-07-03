import { apiRequest } from "./apiClient.js";

const normalizeUser = (user) => ({
  id: user.id,
  login: user.login || "",
  role: user.role || "account_manager",
  createdAt: user.created_at || user.createdAt || "",
  updatedAt: user.updated_at || user.updatedAt || "",
});

const normalizeUsersPayload = (payload) => {
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return {
    items: data.map(normalizeUser),
    meta: {
      currentPage: payload?.current_page || 1,
      perPage: payload?.per_page || data.length || 50,
      total: payload?.total || data.length,
    },
  };
};

export async function getUsers(params = {}) {
  const payload = await apiRequest("/users", { query: params });
  return normalizeUsersPayload(payload);
}

export async function getUserById(id) {
  const payload = await apiRequest(`/users/${id}`);
  return normalizeUser(payload?.data || payload);
}

export async function createUser(payload) {
  const created = await apiRequest("/users", {
    method: "POST",
    body: {
      login: payload.login,
      password: payload.password,
      role: payload.role,
    },
  });
  return normalizeUser(created?.data || created);
}

export async function updateUser(id, payload) {
  const body = {
    login: payload.login,
    role: payload.role,
  };
  if (payload.password) body.password = payload.password;
  const updated = await apiRequest(`/users/${id}`, {
    method: "PATCH",
    body,
  });
  return normalizeUser(updated?.data || updated);
}

export async function deleteUser(id) {
  return apiRequest(`/users/${id}`, { method: "DELETE" });
}
