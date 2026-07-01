import { apiRequest } from "./apiClient.js";
import { mapBackendAssessmentToFrontend } from "./mappers/candidateMapper.js";

export async function runAssessment(requestId, candidateId) {
  const payload = await apiRequest("/assessments", {
    method: "POST",
    body: {
      request_id: requestId,
      candidate_id: candidateId,
    },
  });
  return mapBackendAssessmentToFrontend(payload);
}

export async function getAssessmentById(id) {
  const payload = await apiRequest(`/assessments/${id}`);
  return mapBackendAssessmentToFrontend(payload);
}

export async function getAssessmentsByRequest(requestId) {
  const payload = await apiRequest(`/requests/${requestId}/assessments`);
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return data.map(mapBackendAssessmentToFrontend);
}

export async function compareCandidates(requestId, candidateIds) {
  const payload = await apiRequest(`/requests/${requestId}/compare-candidates`, {
    method: "POST",
    body: { candidate_ids: candidateIds },
  });
  return {
    request_id: payload?.request_id || requestId,
    items: (payload?.items || []).map(mapBackendAssessmentToFrontend),
  };
}

// TODO: подключить публичный endpoint расчёта через API Gateway, когда backend предоставит контракт.
// Внутренний assessment-service POST /api/internal/assessments/calculate не описан в OpenAPI как браузерный endpoint.
