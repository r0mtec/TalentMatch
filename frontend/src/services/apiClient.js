const DEFAULT_API_BASE_URL = "http://localhost:8080/api";

export class ApiError extends Error {
  constructor(message, { status = 0, errors = {}, payload = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.payload = payload;
  }
}

const trimSlash = (value) => String(value || "").replace(/\/+$/, "");

const getBaseUrl = () => trimSlash(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL);

const getToken = () => window.localStorage.getItem("talentmatch_token");

const normalizeValidationErrors = (payload) => {
  const errors = payload?.errors || payload?.validation_errors || {};
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, Array.isArray(messages) ? messages.join(" ") : String(messages)]),
  );
};

const extractErrorMessage = (payload, status) => {
  if (status === 422) return "Ошибка валидации. Проверьте поля заявки.";
  if (status === 401) return "Требуется авторизация.";
  if (status === 404) return "Запись не найдена.";
  if (status >= 500) return "Сервер временно недоступен.";
  if (payload?.message) return payload.message;
  if (payload?.error) return payload.error;
  return "Не удалось выполнить запрос.";
};

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  if (contentType.includes("application/pdf")) return response.blob();
  const text = await response.text();
  return text ? { message: text } : null;
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, headers = {}, query, signal } = options;
  const url = new URL(`${getBaseUrl()}${path}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const token = getToken();
  const isFormData = body instanceof FormData;
  const requestHeaders = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    throw new ApiError("Сервер недоступен. Проверьте адрес API и запущен ли сервер.", { payload: error });
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    if (response.status === 422) console.debug("Backend validation error", payload);
    if (response.status >= 500) console.debug("Backend server error", payload);
    if (response.status === 401) {
      window.localStorage.removeItem("talentmatch_token");
      window.localStorage.removeItem("talentmatch_user");
      if (window.location.pathname !== "/login") {
        window.history.replaceState(null, "", "/login");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
    throw new ApiError(extractErrorMessage(payload, response.status), {
      status: response.status,
      errors: normalizeValidationErrors(payload),
      payload,
    });
  }
  return payload;
}

