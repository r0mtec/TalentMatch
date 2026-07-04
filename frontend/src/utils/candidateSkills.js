const skillSources = [
  "skills",
  "candidate_skills",
  "candidateSkills",
  "recognizedSkills",
  "recognized_skills",
  "technologies",
  "skill_names",
  "skillNames",
  "technology_names",
  "technologyNames",
];

const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

export const getCandidateSkillTitle = (skill) => {
  if (typeof skill === "string") return cleanText(skill);

  const technology = skill?.technology || {};
  return cleanText(
    skill?.title
    || skill?.name
    || skill?.raw_text
    || skill?.rawText
    || skill?.normalized_name
    || skill?.normalizedName
    || skill?.value
    || skill?.text
    || technology.name
    || "",
  );
};

export function normalizeCandidateSkill(skill, index = 0, source = "skills") {
  const title = getCandidateSkillTitle(skill);
  if (!title) return null;

  if (typeof skill === "string") {
    return {
      id: `${source}:${title.toLowerCase()}:${index}`,
      title,
      raw_text: title,
      normalized_name: title.toLowerCase(),
    };
  }

  const technology = skill?.technology || {};
  const technologyId = skill?.technology_id || skill?.technologyId || technology.id || (source === "technologies" ? skill?.id : null);

  return {
    ...skill,
    id: skill?.id || skill?.skill_id || skill?.skillId || technologyId || `${source}:${title.toLowerCase()}:${index}`,
    technologyId,
    technology_id: technologyId,
    title,
    normalized_name: skill?.normalized_name || skill?.normalizedName || title.toLowerCase(),
    raw_text: skill?.raw_text || skill?.rawText || title,
    text_source: skill?.text_source || skill?.evidence_text || skill?.sourceText,
    sourceText: skill?.sourceText || skill?.text_source || skill?.evidence_text,
    confidence: skill?.confidence,
    source_section: skill?.source_section,
    is_manual: Boolean(skill?.is_manual),
  };
}

export function hasCandidateSkillsPayload(candidate = {}) {
  const source = candidate || {};
  return skillSources.some((field) => Object.prototype.hasOwnProperty.call(source, field));
}

export function getCandidateSkills(candidate = {}) {
  const seen = new Set();
  const items = [];

  skillSources.forEach((field) => {
    const source = candidate?.[field];
    if (!Array.isArray(source)) return;

    source.forEach((skill, index) => {
      const normalized = normalizeCandidateSkill(skill, index, field);
      if (!normalized) return;

      const key = [
        String(normalized.technology_id || normalized.technologyId || "").toLowerCase(),
        normalized.title.toLowerCase(),
      ].join(":");

      if (seen.has(key)) return;
      seen.add(key);
      items.push(normalized);
    });
  });

  return items;
}

const mergeValue = (oldValue, newValue) => {
  if (newValue === undefined || newValue === null) return oldValue;
  return newValue;
};

export function mergeCandidateUpdate(oldCandidate = {}, updatedCandidate = {}, rawUpdatedCandidate = updatedCandidate) {
  const previous = oldCandidate || {};
  const updated = updatedCandidate || {};
  const rawUpdated = rawUpdatedCandidate || {};
  const merged = { ...previous };

  Object.entries(updated).forEach(([key, value]) => {
    merged[key] = mergeValue(merged[key], value);
  });

  const oldSkills = getCandidateSkills(previous);
  const updatedHasSkills = hasCandidateSkillsPayload(rawUpdated);
  const nextSkills = updatedHasSkills ? getCandidateSkills(updated) : oldSkills;

  merged.skills = nextSkills;
  merged.recognizedSkills = nextSkills;
  merged.candidate_skills = nextSkills;
  merged.recognized_skills = nextSkills;
  merged.candidateSkills = nextSkills;

  if (!Object.prototype.hasOwnProperty.call(rawUpdated, "assessment")) {
    merged.assessment = previous.assessment;
  }

  if (!Object.prototype.hasOwnProperty.call(rawUpdated, "assessments")) {
    merged.assessments = previous.assessments || [];
  }

  return merged;
}
