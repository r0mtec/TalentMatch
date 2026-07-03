import { extractCandidateNameFromText, getCandidateNameFromFields, isUsableCandidateName } from "../../utils/candidateName.js";

export function mapBackendCandidateToFrontend(payload) {
  const candidate = payload?.data || payload?.candidate || payload;
  const skills = candidate?.skills || candidate?.candidate_skills || candidate?.recognizedSkills || [];
  const assessments = candidate?.assessments || [];
  const recognizedText = candidate?.recognized_text || candidate?.parsed_text || "";
  const fileName = candidate?.original_file_name || candidate?.fileName || candidate?.file_name || "";
  const backendName = getCandidateNameFromFields(candidate);
  const extractedName = extractCandidateNameFromText(recognizedText);
  const displayName = isUsableCandidateName(backendName, fileName) ? backendName : extractedName;

  return {
    id: candidate?.id,
    displayName,
    fullName: displayName,
    fio: displayName,
    grade: candidate?.grade || "Middle",
    location: candidate?.location || "Не указана",
    citizenship: candidate?.citizenship || "",
    languages: candidate?.languages || "",
    uploadedAt: (candidate?.created_at || candidate?.uploadedAt || new Date().toISOString()).slice(0, 10),
    fileName,
    original_file_name: fileName,
    file_storage_key: candidate?.file_storage_key,
    file_mime_type: candidate?.file_mime_type,
    file_size: candidate?.file_size,
    file_checksum: candidate?.file_checksum,
    parsing_status: candidate?.parsing_status || "uploaded",
    recognition_status: candidate?.recognition_status || "pending",
    parsing_error: candidate?.parsing_error || candidate?.parse_error || candidate?.parser_error || "",
    recognition_error: candidate?.recognition_error || candidate?.skill_recognition_error || "",
    recognized_text: recognizedText,
    recognizedSkills: skills.map(mapBackendCandidateSkillToFrontend),
    skills: skills.map(mapBackendCandidateSkillToFrontend),
    assessments: assessments.map(mapBackendAssessmentToFrontend),
  };
}

export function mapBackendCandidateSkillToFrontend(skill) {
  return {
    id: skill.id,
    technologyId: skill.technology_id || skill.technologyId,
    technology_id: skill.technology_id || skill.technologyId,
    title: skill.title || skill.raw_text || skill.normalized_name,
    normalized_name: skill.normalized_name || String(skill.title || skill.raw_text || "").toLowerCase(),
    raw_text: skill.raw_text || skill.title,
    text_source: skill.text_source || skill.evidence_text || skill.sourceText,
    sourceText: skill.sourceText || skill.text_source || skill.evidence_text,
    confidence: skill.confidence,
    source_section: skill.source_section,
    is_manual: Boolean(skill.is_manual),
  };
}

export function getCandidateAssessments(candidate) {
  if (!candidate) return [];
  if (Array.isArray(candidate.assessments)) return candidate.assessments.filter(Boolean);
  return candidate.assessment ? [candidate.assessment] : [];
}

export function getPrimaryAssessment(candidate) {
  const assessments = getCandidateAssessments(candidate);
  return assessments[assessments.length - 1] || null;
}

export function getAssessmentRequestId(candidate) {
  return getPrimaryAssessment(candidate)?.request_id || getPrimaryAssessment(candidate)?.requestId || null;
}

const score = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return Math.round(Number(value || 0));
};

const normalizeAssessmentStatus = (status, hasScores) => {
  if (status === "done") return "calculated";
  if (status) return status;
  return hasScores ? "calculated" : "processing";
};

const requirementResultKeys = (item) => [
  item.resultId ? `result:${item.resultId}` : "",
  item.requirementId ? `requirement:${item.requirementId}:${item.matchedCandidateSkillId || ""}:${item.isMatched}` : "",
  `text:${String(item.type || "").toLowerCase()}:${String(item.title || item.raw_text || "").trim().toLowerCase()}:${item.isMatched}`,
].filter(Boolean);

const dedupeRequirementResults = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const keys = requirementResultKeys(item);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
};

const mapRequirementResult = (result) => {
  const requirement = result.requirement || {};
  const technology = requirement.technology || {};
  const requirementId = requirement.id || result.requirement_id;
  const resultId = result.id || result.assessment_requirement_result_id;
  return {
    id: resultId || requirementId || `${requirement.raw_text || technology.name || result.comment || "requirement"}-${Boolean(result.is_matched)}`,
    resultId,
    requirementId,
    matchedCandidateSkillId: result.matched_candidate_skill_id || result.matchedCandidateSkillId || result.matched_skill?.id || result.matchedSkill?.id || null,
    title: requirement.raw_text || requirement.title || technology.name || result.comment || "Требование",
    raw_text: requirement.raw_text || "",
    technologyId: requirement.technology_id || technology.id || null,
    technology_id: requirement.technology_id || technology.id || null,
    type: requirement.type || result.type || "must",
    weight: Number(requirement.weight || 1),
    isMatched: Boolean(result.is_matched),
    evidenceText: result.evidence_text || result.matched_skill?.evidence_text || result.matchedSkill?.sourceText || "",
    scoreContribution: Number(result.score_contribution || 0),
  };
};

export function mapBackendAssessmentToFrontend(payload) {
  const assessment = payload?.data || payload?.assessment || payload;
  const results = assessment?.requirement_results || assessment?.requirementResults || [];
  const hasScoreValue = (value) => value !== undefined && value !== null && value !== "";
  const hasScores = hasScoreValue(assessment?.total_score)
    || hasScoreValue(assessment?.totalCoverage)
    || hasScoreValue(assessment?.must_score)
    || hasScoreValue(assessment?.nice_score);
  const normalizedResults = dedupeRequirementResults(results.map(mapRequirementResult));
  const closedRequirements = normalizedResults.filter((item) => item.isMatched);
  const missingRequirements = normalizedResults.filter((item) => !item.isMatched);
  const missingMustRequirements = missingRequirements.filter((item) => item.type === "must");
  const status = normalizeAssessmentStatus(assessment?.status, hasScores);
  const isCalculated = Boolean(status === "calculated" || assessment?.calculated_at || assessment?.calculatedAt || normalizedResults.length);
  const hasMissingMustRequirements = Boolean(
    assessment?.has_missing_must_requirements
    ?? assessment?.hasMissingMustRequirements
    ?? missingMustRequirements.length,
  );

  return {
    id: assessment?.id || assessment?.assessment_id,
    request_id: assessment?.request_id || assessment?.requestId,
    requestId: assessment?.request_id || assessment?.requestId,
    candidate_id: assessment?.candidate_id || assessment?.candidateId || assessment?.candidate?.id,
    candidateId: assessment?.candidate_id || assessment?.candidateId || assessment?.candidate?.id,
    status,
    isCalculated,
    runNumber: assessment?.run_number || assessment?.runNumber,
    mustCoverage: isCalculated ? score(assessment?.must_score ?? assessment?.mustCoverage) : null,
    niceCoverage: isCalculated ? score(assessment?.nice_score ?? assessment?.niceCoverage) : null,
    totalCoverage: isCalculated ? score(assessment?.total_score ?? assessment?.totalCoverage) : null,
    must_score: assessment?.must_score,
    nice_score: assessment?.nice_score,
    total_score: assessment?.total_score,
    hasMissingMustRequirements,
    closedRequirements,
    missingRequirements,
    missingMustRequirements,
    requirementResults: normalizedResults,
    calculatedAt: assessment?.calculated_at || assessment?.calculatedAt,
    createdAt: assessment?.created_at || assessment?.createdAt,
    candidate: assessment?.candidate ? mapBackendCandidateToFrontend(assessment.candidate) : null,
    request: assessment?.customer_request || assessment?.customerRequest || assessment?.request || null,
  };
}

export function attachAssessmentsToCandidates(candidates, assessments) {
  const byCandidate = assessments.reduce((acc, assessment) => {
    const candidateId = assessment.candidate_id || assessment.candidateId;
    if (!candidateId) return acc;
    acc.set(candidateId, [...(acc.get(candidateId) || []), assessment]);
    return acc;
  }, new Map());

  return candidates.map((candidate) => ({
    ...candidate,
    assessments: byCandidate.get(candidate.id) || candidate.assessments || [],
  }));
}

