import { apiRequest } from "./apiClient.js";
import { normalizeRole } from "../utils/access.js";

export async function login(credentials) {
  const payload = await apiRequest("/auth/login", {
    method: "POST",
    body: credentials,
  });
  const token = payload?.token || payload?.access_token;
  if (token) window.localStorage.setItem("talentmatch_token", token);
  const user = payload?.user || { login: credentials.login, role: "account_manager" };
  window.localStorage.setItem("talentmatch_user", JSON.stringify({
    login: user.login || credentials.login || "",
    name: user.name || user.fullName || user.login || "Анна Смирнова",
    initials: user.initials || "АС",
    role: normalizeRole(user.role),
  }));
  return user;
}

export async function logout() {
  await apiRequest("/auth/logout", { method: "POST" }).catch(() => null);
  window.localStorage.removeItem("talentmatch_token");
  window.localStorage.removeItem("talentmatch_user");
}
