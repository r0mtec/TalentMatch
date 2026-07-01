import { ApiError, apiRequest } from "./apiClient.js";
import { mapBackendRequestToFrontend, mapFrontendRequestToBackend, mapFrontendRequirementToBackend, mapPaginatedRequests } from "./mappers/requestMapper.js";

const createRequirements = async (requestId, form) => {
  const requirements = [
    ...(form.mustHave || []).map((item) => ({ item, type: "must" })),
    ...(form.niceToHave || []).map((item) => ({ item, type: "nice" })),
  ];
  const created = [];
  for (const requirement of requirements) {
    const result = await apiRequest(`/requests/${requestId}/requirements`, {
      method: "POST",
      body: mapFrontendRequirementToBackend(requirement.item, requirement.type),
    });
    created.push(result);
  }
  return created;
};

export async function getRequests(params = {}) {
  const payload = await apiRequest("/requests", { query: params });
  return mapPaginatedRequests(payload);
}

export async function getRequestById(id) {
  const payload = await apiRequest(`/requests/${id}`);
  return mapBackendRequestToFrontend(payload?.data || payload);
}

export async function createRequest(form, status = form.status || "draft") {
  const requestPayload = mapFrontendRequestToBackend(form, status);
  const created = await apiRequest("/requests", { method: "POST", body: requestPayload });
  const request = mapBackendRequestToFrontend(created?.data || created);
  if (request.id) {
    try {
      await createRequirements(request.id, form);
    } catch (error) {
      throw new ApiError("Заявка создана, но часть требований не сохранилась. Проверьте текст требований и веса.", {
        status: error.status,
        errors: error.errors,
        payload: error.payload,
      });
    }
  }
  // TODO: подключить отправку файлов резюме к заявке после появления request_id/files endpoint в OpenAPI.
  return request.id ? getRequestById(request.id).catch(() => request) : request;
}

export async function updateRequest(id, form, status = form.status || "draft") {
  const updated = await apiRequest(`/requests/${id}`, {
    method: "PATCH",
    body: mapFrontendRequestToBackend(form, status),
  });
  // TODO: заменить на batch sync требований, когда backend/OpenAPI предоставит endpoint для полной замены списка.
  await createRequirements(id, form).catch((error) => {
    throw new ApiError("Запрос обновлён, но требования не синхронизированы. Проверьте текст требований и веса.", {
      status: error.status,
      errors: error.errors,
      payload: error.payload,
    });
  });
  return mapBackendRequestToFrontend(updated?.data || updated);
}

export const activateRequest = (id, form) => updateRequest(id, form, "active");
export const saveDraft = (form) => createRequest(form, "draft");

export async function closeRequest(id) {
  return apiRequest(`/requests/${id}`, { method: "DELETE" });
}

export const deleteRequest = closeRequest;
