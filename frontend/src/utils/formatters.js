export const statusLabels = {
  active: "Активен",
  draft: "Черновик",
  closed: "Закрыт",
  archived: "В архиве",
};

export const processingStatusLabels = {
  uploaded: "Загружено",
  processing: "В обработке",
  pending: "Ожидает",
  parsed: "Выполнено",
  recognized: "Выполнено",
  done: "Выполнено",
  calculated: "Рассчитано",
  queued: "Ожидает",
  failed: "Ошибка",
};

export const assessmentStatusLabels = {
  queued: "Ожидает",
  processing: "В обработке",
  pending: "Ожидает",
  done: "Рассчитано",
  calculated: "Рассчитано",
  failed: "Ошибка расчёта",
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

export const formatProcessingStatus = (status) => processingStatusLabels[status] || status || "Ожидает";

export const formatAssessmentStatus = (status) => assessmentStatusLabels[status] || status || "Ожидает";

export const processingStatusHint = (status) => (status === "failed" ? "Не удалось выполнить обработку" : "");

export const isAssessmentCalculated = (assessment) =>
  Boolean(
    assessment
    && assessment.status !== "failed"
    && (
      assessment.isCalculated
      || assessment.status === "calculated"
      || assessment.status === "done"
      || assessment.calculatedAt
      || assessment.requirementResults?.length
    ),
  );

export const isAssessmentFailed = (assessment) => assessment?.status === "failed";

const bytesToText = (bytes, charset = "utf-8") => {
  try {
    return new TextDecoder(charset || "utf-8").decode(new Uint8Array(bytes));
  } catch {
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }
};

const decodeMimeChunk = (charset, encoding, encoded) => {
  if (encoding.toLowerCase() === "b") {
    const binary = atob(encoded);
    return bytesToText(Array.from(binary, (char) => char.charCodeAt(0)), charset);
  }

  const normalized = encoded.replace(/_/g, " ");
  const bytes = [];
  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized[index] === "=" && /^[0-9a-f]{2}$/i.test(normalized.slice(index + 1, index + 3))) {
      bytes.push(parseInt(normalized.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(normalized.charCodeAt(index));
    }
  }
  return bytesToText(bytes, charset);
};

export const decodeMimeEncodedWord = (value) => {
  const text = String(value || "").trim();
  if (!text.includes("=?")) return text;

  try {
    return text.replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset, encoding, encoded) =>
      decodeMimeChunk(charset, encoding, encoded),
    ).replace(/\s+/g, " ").trim();
  } catch {
    return text;
  }
};

export const weightLabel = (weight) => ({ 1: "Низкий", 2: "Средний", 3: "Высокий", 4: "Критичный" })[weight] || "Средний";

export const gradeBadge = (grade) => `grade-${String(grade).toLowerCase()}`;

export const statusBadge = (status) => {
  if (status === "active") return "status-active";
  if (status === "draft") return "status-draft";
  return "status-closed";
};
