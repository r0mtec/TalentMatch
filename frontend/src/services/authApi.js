import { apiRequest } from "./apiClient.js";
import { normalizeRole } from "../utils/access.js";

const normalizeUser = (user = {}) => ({
  id: user.id,
  login: user.login || "",
  name: user.name || user.fullName || user.login || "",
  initials: user.initials || "",
  role: normalizeRole(user.role),
});

export async function login(credentials) {
  const payload = await apiRequest("/auth/login", {
    method: "POST",
    body: credentials,
  });
  const token = payload?.token || payload?.access_token;
  if (token) window.localStorage.setItem("talentmatch_token", token);
  if (!payload?.user) {
    window.localStorage.removeItem("talentmatch_token");
    throw new Error("Backend не вернул профиль пользователя.");
  }
  const user = normalizeUser(payload.user);
  window.localStorage.setItem("talentmatch_user", JSON.stringify(user));
  return user;
}

export async function getCurrentUser() {
  const payload = await apiRequest("/auth/me");
  const user = normalizeUser(payload?.data || payload);
  window.localStorage.setItem("talentmatch_user", JSON.stringify(user));
  return user;
}

export async function logout() {
  await apiRequest("/auth/logout", { method: "POST" }).catch(() => null);
  window.localStorage.removeItem("talentmatch_token");
  window.localStorage.removeItem("talentmatch_user");
}
