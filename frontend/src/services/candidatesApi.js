import { apiRequest } from "./apiClient.js";
import { mapBackendAssessmentToFrontend, mapBackendCandidateToFrontend, mapBackendCandidateSkillToFrontend } from "./mappers/candidateMapper.js";
import { isValidUuid } from "./mappers/requestMapper.js";
import { getCandidateSkills as readCandidateSkills, mergeCandidateUpdate } from "../utils/candidateSkills.js";

const defaultManualSkillConfidence = 100;

const payloadCandidate = (payload) => payload?.data || payload?.candidate || payload;

const looksLikeCandidatePayload = (payload) => {
  const candidate = payloadCandidate(payload);
  return Boolean(
    candidate?.id
    || candidate?.display_name
    || candidate?.displayName
    || candidate?.fio
    || candidate?.full_name
    || candidate?.fullName
    || candidate?.original_file_name
    || candidate?.skills
    || candidate?.candidate_skills
    || candidate?.candidateSkills
    || candidate?.recognizedSkills
    || candidate?.recognized_skills
  );
};

const normalizedManualConfidence = (value) => {
  if (value === undefined || value === null || value === "") return defaultManualSkillConfidence;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return defaultManualSkillConfidence;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
};

export function mapManualSkillToBackendPayload(skill = {}) {
  const rawText = String(skill.raw_text || skill.title || "").trim();
  if (!rawText) return null;
  const technologyId = skill.technology_id || skill.technologyId;
  const evidenceText = skill.evidence_text ?? skill.sourceText ?? skill.text_source ?? null;

  return {
    technology_id: isValidUuid(technologyId) ? technologyId : null,
    raw_text: rawText,
    normalized_name: String(skill.normalized_name || rawText).trim().toLowerCase(),
    evidence_text: evidenceText === "" ? null : evidenceText,
    confidence: normalizedManualConfidence(skill.confidence),
  };
}

export async function getCandidates(params = {}) {
  const payload = await apiRequest("/candidates", { query: params });
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return data.map(mapBackendCandidateToFrontend);
}

export async function getAllCandidates(params = {}) {
  const firstPayload = await apiRequest("/candidates", { query: { ...params, page: 1, per_page: params.per_page || 100 } });
  const firstData = Array.isArray(firstPayload) ? firstPayload : firstPayload?.data || [];
  const items = firstData.map(mapBackendCandidateToFrontend);
  const lastPage = Number(firstPayload?.last_page || firstPayload?.meta?.last_page || 1);

  for (let page = 2; page <= lastPage; page += 1) {
    const payload = await apiRequest("/candidates", { query: { ...params, page, per_page: params.per_page || 100 } });
    const data = Array.isArray(payload) ? payload : payload?.data || [];
    items.push(...data.map(mapBackendCandidateToFrontend));
  }

  return items;
}

export async function getCandidateById(id) {
  const payload = await apiRequest(`/candidates/${id}`);
  return mapBackendCandidateToFrontend(payload);
}

export async function updateCandidate(id, candidate = {}, currentCandidate = null) {
  const body = {};
  if (
    Object.prototype.hasOwnProperty.call(candidate, "display_name")
    || Object.prototype.hasOwnProperty.call(candidate, "displayName")
    || Object.prototype.hasOwnProperty.call(candidate, "fullName")
    || Object.prototype.hasOwnProperty.call(candidate, "fio")
  ) {
    body.display_name = String(candidate.display_name ?? candidate.displayName ?? candidate.fullName ?? candidate.fio ?? "").trim();
  }
  ["grade", "location", "citizenship", "languages"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(candidate, field)) body[field] = candidate[field] || null;
  });

  const payload = await apiRequest(`/candidates/${id}`, {
    method: "PATCH",
    body,
  });

  if (!looksLikeCandidatePayload(payload)) {
    return currentCandidate
      ? mergeCandidateUpdate(currentCandidate, mapBackendCandidateToFrontend({ ...currentCandidate, ...body }), body)
      : mapBackendCandidateToFrontend({ id, ...body });
  }

  const rawCandidate = payloadCandidate(payload);
  const updated = mapBackendCandidateToFrontend(payload);
  return currentCandidate ? mergeCandidateUpdate(currentCandidate, updated, rawCandidate) : updated;
}

export async function getCandidateSkills(candidateId) {
  const payload = await apiRequest(`/candidates/${candidateId}/skills`);
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return data.map(mapBackendCandidateSkillToFrontend).filter(Boolean);
}

export async function hydrateCandidateSkills(candidate) {
  const currentSkills = readCandidateSkills(candidate);
  if (currentSkills.length || !candidate?.id) {
    return mergeCandidateUpdate(candidate, {
      skills: currentSkills,
      recognizedSkills: currentSkills,
      candidate_skills: currentSkills,
    }, { skills: currentSkills });
  }

  const skills = await getCandidateSkills(candidate.id).catch(() => currentSkills);
  return mergeCandidateUpdate(candidate, {
    skills,
    recognizedSkills: skills,
    candidate_skills: skills,
  }, { skills });
}

export async function hydrateCandidatesSkills(candidates = []) {
  return Promise.all(candidates.map(hydrateCandidateSkills));
}

// Parser and skill recognition are internal services; browser upload flows read returned processing statuses and skills.
export async function batchUploadCandidateResumes(files, fields = {}) {
  const formData = new FormData();
  Array.from(files || []).forEach((file) => formData.append("resumes[]", file));
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") formData.append(key, value);
  });

  const payload = await apiRequest("/candidates/batch-upload", {
    method: "POST",
    body: formData,
  });

  return {
    items: (payload?.candidates || []).map((item) => ({
      candidate: mapBackendCandidateToFrontend(item.candidate || item),
      assessment: item.assessment ? mapBackendAssessmentToFrontend(item.assessment) : null,
    })),
    errors: payload?.errors || [],
  };
}

export async function createCandidateSkill(candidateId, skill) {
  const body = mapManualSkillToBackendPayload(skill);
  if (!body) throw new Error("Навык не заполнен.");
  const payload = await apiRequest(`/candidates/${candidateId}/skills`, {
    method: "POST",
    body,
  });
  return mapBackendCandidateSkillToFrontend(payload);
}

export async function updateCandidateSkill(skillId, skill) {
  const body = mapManualSkillToBackendPayload(skill);
  if (!body) throw new Error("Навык не заполнен.");
  const payload = await apiRequest(`/candidate-skills/${skillId}`, {
    method: "PATCH",
    body,
  });
  return mapBackendCandidateSkillToFrontend(payload);
}

export async function deleteCandidateSkill(skillId) {
  return apiRequest(`/candidate-skills/${skillId}`, { method: "DELETE" });
}

