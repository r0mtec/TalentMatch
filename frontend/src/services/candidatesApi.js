import { apiRequest } from "./apiClient.js";
import { mapBackendCandidateToFrontend } from "./mappers/candidateMapper.js";
import { mapBackendCandidateSkillToFrontend } from "./mappers/candidateMapper.js";
import { isValidUuid } from "./mappers/requestMapper.js";

export async function getCandidates(params = {}) {
  const payload = await apiRequest("/candidates", { query: params });
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return data.map(mapBackendCandidateToFrontend);
}

export async function getCandidateById(id) {
  const payload = await apiRequest(`/candidates/${id}`);
  return mapBackendCandidateToFrontend(payload);
}

export async function getCandidateSkills(candidateId) {
  const payload = await apiRequest(`/candidates/${candidateId}/skills`);
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return data.map(mapBackendCandidateSkillToFrontend);
}

export async function uploadCandidateResume(file, fields = {}) {
  const formData = new FormData();
  formData.append("resume", file);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") formData.append(key, value);
  });

  const payload = await apiRequest("/candidates/upload", {
    method: "POST",
    body: formData,
  });
  return mapBackendCandidateToFrontend(payload);
}

export async function createCandidateSkill(candidateId, skill) {
  const technologyId = skill.technology_id || skill.technologyId;
  const payload = await apiRequest(`/candidates/${candidateId}/skills`, {
    method: "POST",
    body: {
      technology_id: isValidUuid(technologyId) ? technologyId : null,
      raw_text: skill.raw_text || skill.title || "",
      normalized_name: skill.normalized_name || String(skill.title || skill.raw_text || "").toLowerCase(),
      evidence_text: skill.evidence_text || skill.sourceText || skill.text_source || null,
      confidence: skill.confidence || null,
    },
  });
  return mapBackendCandidateSkillToFrontend(payload);
}

export async function updateCandidateSkill(skillId, skill) {
  const technologyId = skill.technology_id || skill.technologyId;
  const payload = await apiRequest(`/candidate-skills/${skillId}`, {
    method: "PATCH",
    body: {
      technology_id: isValidUuid(technologyId) ? technologyId : null,
      raw_text: skill.raw_text || skill.title || "",
      normalized_name: skill.normalized_name || String(skill.title || skill.raw_text || "").toLowerCase(),
      evidence_text: skill.evidence_text || skill.sourceText || skill.text_source || null,
      confidence: skill.confidence || null,
    },
  });
  return mapBackendCandidateSkillToFrontend(payload);
}

export async function deleteCandidateSkill(skillId) {
  return apiRequest(`/candidate-skills/${skillId}`, { method: "DELETE" });
}
