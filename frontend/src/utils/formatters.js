export const statusLabels = {
  active: "Активен",
  draft: "Черновик",
  closed: "Закрыт",
};

export const groupLabels = {
  languages: "Языки",
  frameworks: "Фреймворки",
  databases: "Базы данных",
  infrastructure: "Инфраструктура",
  other: "Прочее",
};

export const formatDate = (date) => new Intl.DateTimeFormat("ru-RU").format(new Date(date));

export const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(String(value || ""));

export const shortId = (value) => {
  const text = String(value || "");
  if (!text) return "";
  return isUuid(text) ? text.slice(0, 8) : text;
};

export const requestTitle = (request) =>
  request?.position || request?.post || request?.title || (request?.id ? `Заявка ${shortId(request.id)}` : "Заявка");

export const requestOptionLabel = (request) =>
  [requestTitle(request), request?.grade, statusLabels[request?.status] || request?.status].filter(Boolean).join(" · ");

export const weightLabel = (weight) => ({ 1: "Низкий", 2: "Средний", 3: "Высокий", 4: "Критичный" })[weight] || "Средний";

export const gradeBadge = (grade) => `grade-${String(grade).toLowerCase()}`;

export const statusBadge = (status) => {
  if (status === "active") return "status-active";
  if (status === "draft") return "status-draft";
  return "status-closed";
};
