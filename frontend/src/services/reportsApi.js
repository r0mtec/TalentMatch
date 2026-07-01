import { apiRequest } from "./apiClient.js";

export async function downloadAssessmentReport(assessmentId) {
  return apiRequest(`/assessments/${assessmentId}/report.pdf`, {
    headers: { Accept: "application/pdf" },
  });
}

export async function downloadComparisonReport(requestId) {
  return apiRequest(`/requests/${requestId}/comparison-report.pdf`, {
    headers: { Accept: "application/pdf" },
  });
}
