import { apiRequest } from "./apiClient.js";
import { mapBackendAssessmentToFrontend } from "./mappers/candidateMapper.js";

export async function runAssessmentForRequestCandidate(requestId, candidateId) {
  const payload = await apiRequest(`/requests/${requestId}/candidates/${candidateId}/assessments`, {
    method: "POST",
  });
  return mapBackendAssessmentToFrontend({ ...payload, request_id: requestId, candidate_id: candidateId });
}

export async function getAssessmentById(id) {
  const payload = await apiRequest(`/assessments/${id}`);
  return mapBackendAssessmentToFrontend(payload);
}

export async function getAssessmentsByRequest(requestId, params = {}) {
  const payload = await apiRequest(`/requests/${requestId}/assessments`, { query: params });
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
    items: (payload?.items || []).map((item) => mapBackendAssessmentToFrontend({
      ...item,
      id: item.id || item.assessment_id,
      request_id: payload?.request_id || requestId,
      candidate_id: item.candidate_id || item.candidate?.id,
      status: item.status || item.assessment_status,
      created_at: item.created_at,
    })),
  };
}

// Internal calculate endpoint is described in OpenAPI for service-to-service flows.
// Browser UI uses public assessment orchestration endpoints above.
