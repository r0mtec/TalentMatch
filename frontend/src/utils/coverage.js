export const normalize = (value) => String(value || "").trim().toLowerCase();

const technologyAliases = (technology) => {
  if (!technology) return [];
  return [technology.id, technology.name, ...(technology.synonyms || [])].map(normalize);
};

const aliasesForRequirement = (requirement, technologies) => {
  const technology = technologies.find((item) => item.id === requirement.technologyId);
  return new Set([requirement.title, requirement.technologyId, ...technologyAliases(technology)].map(normalize));
};

const aliasesForSkill = (skill, technologies) => {
  const technology = technologies.find((item) => item.id === skill.technologyId);
  return new Set([skill.title, skill.technologyId, ...technologyAliases(technology)].map(normalize));
};

export const isRequirementClosed = (requirement, candidate, technologies) => {
  const requirementAliases = aliasesForRequirement(requirement, technologies);
  return candidate.skills.some((skill) => [...aliasesForSkill(skill, technologies)].some((alias) => requirementAliases.has(alias)));
};

const percent = (requirements, closed) => {
  const total = requirements.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (!total) return 0;
  const current = closed.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  return Math.round((current / total) * 100);
};

export const calculateAssessment = (request, candidate, technologies) => {
  const all = [...request.mustHave, ...request.niceToHave];
  const closed = all.filter((requirement) => isRequirementClosed(requirement, candidate, technologies));
  const missing = all.filter((requirement) => !closed.includes(requirement));
  const closedMust = request.mustHave.filter((requirement) => closed.includes(requirement));
  const closedNice = request.niceToHave.filter((requirement) => closed.includes(requirement));

  return {
    overall: percent(all, closed),
    must: percent(request.mustHave, closedMust),
    nice: percent(request.niceToHave, closedNice),
    closed,
    missing,
    missingMust: request.mustHave.filter((requirement) => missing.includes(requirement)),
  };
};
