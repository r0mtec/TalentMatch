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

export const weightLabel = (weight) => ({ 1: "Низкий", 2: "Средний", 3: "Высокий", 4: "Критичный" })[weight] || "Средний";

export const gradeBadge = (grade) => `grade-${String(grade).toLowerCase()}`;

export const statusBadge = (status) => {
  if (status === "active") return "status-active";
  if (status === "draft") return "status-draft";
  return "status-closed";
};
