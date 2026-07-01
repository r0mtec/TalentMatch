export function mapBackendCandidateToFrontend(payload) {
  const candidate = payload?.data || payload?.candidate || payload;
  const skills = candidate?.skills || candidate?.candidate_skills || candidate?.recognizedSkills || [];
  const assessments = candidate?.assessments || [];

  return {
    id: candidate?.id,
    fullName: candidate?.fullName || candidate?.fio || candidate?.display_name || candidate?.original_file_name || "Кандидат без имени",
    fio: candidate?.fio || candidate?.display_name || candidate?.fullName,
    grade: candidate?.grade || "Middle",
    location: candidate?.location || "Не указана",
    citizenship: candidate?.citizenship || "",
    languages: candidate?.languages || "",
    uploadedAt: (candidate?.created_at || candidate?.uploadedAt || new Date().toISOString()).slice(0, 10),
    fileName: candidate?.original_file_name || candidate?.fileName || candidate?.file_name || "",
    original_file_name: candidate?.original_file_name || candidate?.fileName || "",
    file_storage_key: candidate?.file_storage_key,
    file_mime_type: candidate?.file_mime_type,
    file_size: candidate?.file_size,
    file_checksum: candidate?.file_checksum,
    parsing_status: candidate?.parsing_status || "parsed",
    recognition_status: candidate?.recognition_status || "recognized",
    recognized_text: candidate?.recognized_text || "",
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

const score = (value) => Math.round(Number(value || 0));

const mapRequirementResult = (result) => {
  const requirement = result.requirement || {};
  const technology = requirement.technology || {};
  return {
    id: requirement.id || result.requirement_id || result.id,
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
  const normalizedResults = results.map(mapRequirementResult);
  const closedRequirements = normalizedResults.filter((item) => item.isMatched);
  const missingRequirements = normalizedResults.filter((item) => !item.isMatched);
  const missingMustRequirements = missingRequirements.filter((item) => item.type === "must");
  const hasMissingMustRequirements = Boolean(
    assessment?.has_missing_must_requirements
    ?? assessment?.hasMissingMustRequirements
    ?? missingMustRequirements.length,
  );

  return {
    id: assessment?.id,
    request_id: assessment?.request_id || assessment?.requestId,
    requestId: assessment?.request_id || assessment?.requestId,
    candidate_id: assessment?.candidate_id || assessment?.candidateId,
    candidateId: assessment?.candidate_id || assessment?.candidateId,
    status: assessment?.status || "processing",
    runNumber: assessment?.run_number || assessment?.runNumber,
    mustCoverage: score(assessment?.must_score ?? assessment?.mustCoverage),
    niceCoverage: score(assessment?.nice_score ?? assessment?.niceCoverage),
    totalCoverage: score(assessment?.total_score ?? assessment?.totalCoverage),
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
