import { ApiError, apiRequest } from "./apiClient.js";
import {
  isValidUuid,
  mapBackendRequestToFrontend,
  mapFrontendRequestToBackend,
  mapPaginatedRequests,
  mapRequirementToBackend,
  mapRequirementsToBackend,
} from "./mappers/requestMapper.js";

const typedRequirements = (form) => [
  ...(form.mustHave || []).map((item) => ({ item, type: "must" })),
  ...(form.niceToHave || []).map((item) => ({ item, type: "nice" })),
];

const createRequirements = async (requestId, form) => {
  const requirements = mapRequirementsToBackend(form.mustHave, form.niceToHave);
  const created = [];
  for (const requirement of requirements) {
    const result = await apiRequest(`/requests/${requestId}/requirements`, {
      method: "POST",
      body: requirement,
    });
    created.push(result);
  }
  return created;
};

const syncRequirements = async (requestId, form) => {
  const saved = [];
  for (const requirement of typedRequirements(form)) {
    const body = mapRequirementToBackend(requirement.item, requirement.type);
    const hasBackendId = isValidUuid(requirement.item.id);
    const result = await apiRequest(hasBackendId ? `/requirements/${requirement.item.id}` : `/requests/${requestId}/requirements`, {
      method: hasBackendId ? "PATCH" : "POST",
      body,
    });
    saved.push(result);
  }
  // TODO: удалить requirements, убранные из формы, когда backend/OpenAPI предоставит batch replace или когда UI начнёт хранить original ids для diff.
  return saved;
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
  return request.id ? getRequestById(request.id).catch(() => request) : request;
}

export async function updateRequest(id, form, status = form.status || "draft") {
  const updated = await apiRequest(`/requests/${id}`, {
    method: "PATCH",
    body: mapFrontendRequestToBackend(form, status),
  });
  await syncRequirements(id, form).catch((error) => {
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
