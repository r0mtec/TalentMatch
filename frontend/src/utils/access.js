export const roleLabels = {
  account_manager: "Аккаунт-менеджер",
  leader: "Руководитель",
  admin: "Администратор",
};

export const normalizeRole = (role) => {
  if (role === "lead") return "leader";
  if (role === "administrator") return "admin";
  return role || "account_manager";
};

export const getStoredUser = () => {
  try {
    const user = JSON.parse(window.localStorage.getItem("talentmatch_user") || "null");
    return user ? { ...user, role: normalizeRole(user.role) } : null;
  } catch {
    return null;
  }
};

const routeAccess = {
  dashboard: ["account_manager", "leader", "admin"],
  requests: ["account_manager", "leader"],
  requestEdit: ["account_manager"],
  candidates: ["account_manager", "leader"],
  comparison: ["leader"],
  dictionary: ["admin"],
  users: ["admin"],
  rules: ["admin"],
};

const actionAccess = {
  createRequest: ["account_manager"],
  editRequest: ["account_manager"],
  uploadResume: ["account_manager"],
  editCandidate: ["account_manager"],
  editCandidateSkills: ["account_manager"],
  recalculateAssessment: ["account_manager"],
  exportCandidateReport: ["account_manager"],
  exportComparisonReport: ["leader"],
  editDictionary: ["admin"],
  manageUsers: ["admin"],
};

export const canAccess = (scope, role = getStoredUser()?.role) =>
  Boolean(role && (routeAccess[scope] || []).includes(normalizeRole(role)));

export const canDo = (action, role = getStoredUser()?.role) =>
  Boolean(role && (actionAccess[action] || []).includes(normalizeRole(role)));

export const defaultPathForRole = (role) => {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "/dashboard";
  if (normalized === "leader") return "/dashboard";
  return "/dashboard";
};

