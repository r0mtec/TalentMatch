import { createContext, createElement, useContext, useMemo, useState } from "react";
import { candidates as initialCandidates, currentUser, requests as initialRequests, technologies as initialTechnologies, users as initialUsers } from "../data/mockData.js";
import { calculateAssessment } from "../utils/coverage.js";

const MockDataContext = createContext(null);
const delay = (ms = 260) => new Promise((resolve) => window.setTimeout(resolve, ms));
const id = () => Math.random().toString(36).slice(2, 9);

const mockSkillSets = [
  [
    { technologyId: "php", title: "PHP" },
    { technologyId: "laravel", title: "Laravel" },
    { technologyId: "postgresql", title: "PostgreSQL" },
    { technologyId: "rest-api", title: "REST API" },
    { technologyId: "docker", title: "Docker" },
  ],
  [
    { technologyId: "react", title: "React" },
    { technologyId: "typescript", title: "TypeScript" },
    { technologyId: "openapi", title: "OpenAPI" },
    { technologyId: "nodejs", title: "Node.js" },
  ],
  [
    { technologyId: "docker", title: "Docker" },
    { technologyId: "kubernetes", title: "Kubernetes" },
    { technologyId: "linux", title: "Linux" },
    { technologyId: "gitlab-ci", title: "GitLab CI" },
  ],
  [
    { technologyId: "python", title: "Python" },
    { technologyId: "django", title: "Django" },
    { technologyId: "postgresql", title: "PostgreSQL" },
    { technologyId: "kafka", title: "Kafka" },
  ],
];

const normalizeSkills = (candidate) => {
  const recognizedSkills = candidate.recognizedSkills || candidate.skills || [];
  return { ...candidate, recognizedSkills, skills: recognizedSkills };
};

const toServerAssessment = (assessment) => ({
  id: `assessment-${id()}`,
  total_coverage: assessment.overall,
  must_coverage: assessment.must,
  nice_coverage: assessment.nice,
  totalCoverage: assessment.overall,
  mustCoverage: assessment.must,
  niceCoverage: assessment.nice,
  has_missing_must_requirements: assessment.missingMust.length > 0,
  grade_match_status: "matched",
  location_match_status: "matched",
  citizenship_match_status: "matched",
  status: "calculated",
  calculated_at: new Date().toISOString().slice(0, 10),
  closedRequirements: assessment.closed,
  missingRequirements: assessment.missing,
  missingMustRequirements: assessment.missingMust,
});

const attachAssessment = (candidate, requests, technologies) => {
  const normalized = normalizeSkills(candidate);
  const request = requests.find((item) => item.id === normalized.requestId);
  if (!request) return { ...normalized, assessment: null };
  const assessment = toServerAssessment(calculateAssessment(request, normalized, technologies));
  const requirementResults = [...request.mustHave, ...request.niceToHave].map((requirement) => {
    const matchedSkill = assessment.closedRequirements.includes(requirement)
      ? normalized.recognizedSkills.find((skill) => skill.technologyId === requirement.technologyId || skill.technology_id === requirement.technology_id)
      : null;
    return {
      id: `arr-${id()}`,
      assessment_id: assessment.id,
      requirement_id: requirement.id,
      matched_candidate_skill_id: matchedSkill?.id || null,
      is_matched: Boolean(matchedSkill),
      evidence_text: matchedSkill?.sourceText || matchedSkill?.text_source || "",
      score_contribution: matchedSkill ? requirement.weight : 0,
      comment: matchedSkill ? `Совпадение по ${requirement.title}` : `Навык ${requirement.title} не найден`,
      created_at: assessment.calculated_at,
      updated_at: assessment.calculated_at,
    };
  });
  return {
    ...normalized,
    request_id: normalized.requestId,
    fio: normalized.fullName,
    assessment: { ...assessment, candidate_id: normalized.id, request_id: normalized.requestId, requirementResults, assessment_requirement_results: requirementResults },
  };
};

const makeCandidateFromFile = (file, request, index, technologies) => {
  const skills = mockSkillSets[index % mockSkillSets.length].map((skill, skillIndex) => ({
    id: `skill-${id()}-${skillIndex}`,
    ...skill,
    technology_id: skill.technologyId,
    candidate_id: null,
    normalized_name: skill.title.toLowerCase(),
    raw_text: skill.title,
    text_source: `Mock-распознавание из файла ${file.name}: найден навык ${skill.title}`,
    confidence: 94,
    source_section: "skills",
    is_manual: false,
    sourceText: `Mock-распознавание из файла ${file.name}: найден навык ${skill.title}`,
  }));
  const candidate = {
    id: `cand-${id()}`,
    requestId: request.id,
    request_id: request.id,
    fullName: file.name.replace(/\.(pdf|docx)$/i, "") || "Кандидат без имени",
    fio: file.name.replace(/\.(pdf|docx)$/i, "") || "Кандидат без имени",
    grade: request.grade,
    location: request.location || "Не указана",
    citizenship: request.citizenship || "Не указано",
    languages: "Русский",
    uploadedAt: new Date().toISOString().slice(0, 10),
    fileName: file.name,
    original_file_name: file.name,
    file_storage_key: `mock/${file.name}`,
    file_mime_type: file.name.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
    file_size: file.size || 1200000,
    file_checksum: `mock-checksum-${id()}`,
    parsing_status: "parsed",
    recognition_status: "recognized",
    recognized_text: `Распознанный mock-текст резюме ${file.name}. Найдены навыки: ${skills.map((skill) => skill.title).join(", ")}.`,
    created_by: request.created_by || "user-1",
    created_at: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString().slice(0, 10),
    recognizedSkills: skills,
    skills,
  };
  candidate.recognizedSkills = candidate.recognizedSkills.map((skill) => ({ ...skill, candidate_id: candidate.id }));
  candidate.skills = candidate.recognizedSkills;
  return attachAssessment(candidate, [request], technologies);
};

export function MockDataProvider({ children }) {
  const [requests, setRequests] = useState(initialRequests);
  const [technologies, setTechnologies] = useState(initialTechnologies);
  const [users, setUsers] = useState(initialUsers);
  const [candidates, setCandidates] = useState(() =>
    initialCandidates.map((candidate) => attachAssessment(candidate, initialRequests, initialTechnologies)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async (operation, ms) => {
    setLoading(true);
    setError(null);
    try {
      await delay(ms);
      return operation();
    } catch (caught) {
      setError("Не удалось выполнить mock-операцию.");
      throw caught;
    } finally {
      setLoading(false);
    }
  };

  const api = useMemo(
    () => ({
      user: currentUser,
      requests,
      candidates,
      technologies,
      users,
      loading,
      error,
      login: (credentials) =>
        run(() => {
          const user = { name: "Анна Смирнова", initials: "АС", role: "account_manager", login: credentials.login };
          window.localStorage.setItem("talentmatch_user", JSON.stringify(user));
          return user;
        }),
      getRequests: (params = {}) =>
        run(() => requests.filter((request) => !params.status || request.status === params.status)),
      createRequest: (payloadWithFiles) =>
        run(() => {
          const { files = [], ...payload } = payloadWithFiles;
          const request = {
            ...payload,
            id: payload.id || `REQ-${String(requests.length + 1).padStart(3, "0")}`,
            createdAt: payload.createdAt || new Date().toISOString().slice(0, 10),
            position: payload.position || payload.post,
            post: payload.position || payload.post,
            startDate: payload.startDate || payload.employment_date,
            employment_date: payload.startDate || payload.employment_date,
            engagementPeriod: payload.engagementPeriod || payload.engagement_period,
            engagement_period: payload.engagementPeriod || payload.engagement_period,
            created_by: payload.created_by || "user-1",
            created_at: payload.createdAt || new Date().toISOString().slice(0, 10),
            updated_at: new Date().toISOString().slice(0, 10),
          };
          const createdCandidates = files.map((file, index) => makeCandidateFromFile(file, request, index, technologies));
          setRequests((items) => [request, ...items.filter((item) => item.id !== request.id)]);
          setCandidates((items) => [...createdCandidates, ...items.filter((item) => item.requestId !== request.id || !createdCandidates.some((candidate) => candidate.id === item.id))]);
          return { request, candidates: createdCandidates };
        }, 520),
      updateRequest: (requestId, payload) =>
        run(() => {
          const { files = [], ...requestPayload } = payload;
          const request = {
            ...requestPayload,
            id: requestId,
            position: requestPayload.position || requestPayload.post,
            post: requestPayload.position || requestPayload.post,
            startDate: requestPayload.startDate || requestPayload.employment_date,
            employment_date: requestPayload.startDate || requestPayload.employment_date,
            engagementPeriod: requestPayload.engagementPeriod || requestPayload.engagement_period,
            engagement_period: requestPayload.engagementPeriod || requestPayload.engagement_period,
            updated_at: new Date().toISOString().slice(0, 10),
          };
          const createdCandidates = files.map((file, index) => makeCandidateFromFile(file, request, index, technologies));
          setRequests((items) => items.map((item) => (item.id === requestId ? request : item)));
          setCandidates((items) => [
            ...createdCandidates,
            ...items.map((candidate) => (candidate.requestId === requestId ? attachAssessment(candidate, [request], technologies) : candidate)),
          ]);
          return { request, candidates: createdCandidates };
        }),
      getCandidates: (params = {}) =>
        run(() => candidates.filter((candidate) => (!params.requestId || candidate.requestId === params.requestId) && candidate.requestId)),
      getCandidateById: (candidateId) => run(() => candidates.find((candidate) => candidate.id === candidateId) || null),
      updateCandidateSkills: (candidateId, recognizedSkills) =>
        run(() => {
          let updated = null;
          setCandidates((items) =>
            items.map((candidate) => {
              if (candidate.id !== candidateId) return candidate;
              const skills = recognizedSkills.map((skill, index) => {
                const title = typeof skill === "string" ? skill : skill.title;
                const technology = technologies.find((item) => item.name.toLowerCase() === title.toLowerCase() || item.id === skill.technologyId);
                return {
                  id: skill.id || `skill-${candidateId}-${index}`,
                  technologyId: technology?.id || skill.technologyId || title.toLowerCase().replace(/\s+/g, "-"),
                  technology_id: technology?.id || skill.technologyId || title.toLowerCase().replace(/\s+/g, "-"),
                  title,
                  normalized_name: title.toLowerCase(),
                  raw_text: title,
                  text_source: skill.sourceText || `Навык ${title} добавлен вручную менеджером`,
                  confidence: 100,
                  source_section: "manual",
                  is_manual: true,
                  sourceText: skill.sourceText || `Навык ${title} добавлен вручную менеджером`,
                };
              });
              const request = requests.find((item) => item.id === candidate.requestId);
              updated = attachAssessment({ ...candidate, recognizedSkills: skills, skills }, request ? [request] : requests, technologies);
              return updated;
            }),
          );
          return updated;
        }, 420),
      getAssessmentsByRequest: (requestId) =>
        run(() => candidates.filter((candidate) => candidate.requestId === requestId).map((candidate) => ({ candidateId: candidate.id, assessment: candidate.assessment }))),
      reassessCandidateForRequest: (candidateId, targetRequestId) =>
        run(() => {
          const source = candidates.find((candidate) => candidate.id === candidateId);
          const request = requests.find((item) => item.id === targetRequestId);
          if (!source || !request) return null;
          const copy = attachAssessment({
            ...source,
            id: `cand-${id()}`,
            requestId: request.id,
            request_id: request.id,
            created_at: new Date().toISOString().slice(0, 10),
            updated_at: new Date().toISOString().slice(0, 10),
          }, [request], technologies);
          setCandidates((items) => [copy, ...items]);
          return copy;
        }, 480),
      exportCandidateReport: (candidateId) =>
        run(() => ({ candidateId, fileName: `talentmatch-report-${candidateId}.pdf`, status: "prepared" }), 360),
      getUsers: () => run(() => users),
      updateUserRole: (userId, role) =>
        run(() => {
          let updated = null;
          setUsers((items) => items.map((user) => {
            if (user.id !== userId) return user;
            updated = { ...user, role };
            return updated;
          }));
          return updated;
        }),
      getTechnologies: (params = {}) =>
        run(() => technologies.filter((technology) => !params.group || technology.group === params.group)),
      createTechnology: (payload) =>
        run(() => {
          const saved = { ...payload, id: payload.id || payload.name.toLowerCase().replace(/\s+/g, "-") || `tech-${id()}` };
          setTechnologies((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
          return saved;
        }),
      updateTechnology: (technologyId, payload) =>
        run(() => {
          const saved = { ...payload, id: technologyId };
          setTechnologies((items) => items.map((item) => (item.id === technologyId ? saved : item)));
          return saved;
        }),
      deleteTechnology: (technologyId) =>
        run(() => {
          setTechnologies((items) => items.filter((item) => item.id !== technologyId));
          return { id: technologyId };
        }),
    }),
    [candidates, error, loading, requests, technologies, users],
  );

  return createElement(MockDataContext.Provider, { value: api }, children);
}

export const useMockApi = () => {
  const context = useContext(MockDataContext);
  if (!context) throw new Error("useMockApi must be used inside MockDataProvider");
  return context;
};
