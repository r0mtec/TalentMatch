const statusToBackend = { active: "active", draft: "draft", closed: "closed" };
const statusFromBackend = { active: "active", draft: "draft", closed: "closed" };

export const isValidUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(String(value || ""));

const normalizeRequirement = (requirement, type, requestId) => ({
  id: requirement.id,
  request_id: requirement.request_id || requestId,
  title: requirement.title || requirement.raw_text || requirement.name || "",
  raw_text: requirement.raw_text || requirement.title || "",
  technologyId: requirement.technology_id || requirement.technologyId || null,
  technology_id: requirement.technology_id || requirement.technologyId || null,
  type: requirement.type || type,
  weight: Number(requirement.weight || 1),
});

export function mapBackendRequestToFrontend(payload) {
  const request = payload?.data || payload;
  const requirements = request?.requirements || [];
  const mustHave = [
    ...(request?.must_have || []),
    ...requirements.filter((item) => item.type === "must"),
  ].map((item) => normalizeRequirement(item, "must", request?.id));
  const niceToHave = [
    ...(request?.nice_to_have || []),
    ...requirements.filter((item) => item.type === "nice"),
  ].map((item) => normalizeRequirement(item, "nice", request?.id));

  return {
    id: request?.id,
    title: request?.title || request?.position || request?.post || "",
    position: request?.position || request?.post || request?.title || "",
    post: request?.position || request?.post || request?.title || "",
    description: request?.project_description || request?.description || "",
    grade: request?.grade || "Middle",
    location: request?.location || "",
    citizenship: request?.citizenship || "",
    workload: request?.workload || "",
    startDate: request?.start_date || request?.employment_date || "",
    employment_date: request?.start_date || request?.employment_date || "",
    engagementPeriod: request?.engagement_period || request?.engagementPeriod || "",
    status: statusFromBackend[request?.status] || request?.status || "draft",
    createdAt: (request?.created_at || request?.createdAt || "").slice(0, 10),
    updated_at: request?.updated_at,
    created_by: request?.created_by,
    mustHave,
    niceToHave,
  };
}

export function mapFrontendRequestToBackend(form, status) {
  return {
    title: form.position || form.post || form.title || "Новая заявка",
    position: form.position || form.post || form.title || "",
    project_description: form.description || "",
    grade: form.grade || null,
    location: form.location || null,
    citizenship: form.citizenship || null,
    workload: form.workload || null,
    start_date: form.startDate || form.employment_date || null,
    status: statusToBackend[status || form.status] || status || form.status || "draft",
    // TODO: отправлять engagement_period после добавления поля в OpenAPI CustomerRequestInput.
  };
}

export function mapRequirementToBackend(requirement, type) {
  const technologyId = requirement.technology_id || requirement.technologyId;
  const rawText = requirement.raw_text || requirement.title || requirement.name || "";
  return {
    technology_id: isValidUuid(technologyId) ? technologyId : null,
    raw_text: rawText.trim(),
    type,
    weight: Number(requirement.weight || 1),
  };
}

export function mapRequirementsToBackend(mustHave = [], niceToHave = []) {
  return [
    ...mustHave.map((requirement) => mapRequirementToBackend(requirement, "must")),
    ...niceToHave.map((requirement) => mapRequirementToBackend(requirement, "nice")),
  ];
}

export const mapFrontendRequirementToBackend = mapRequirementToBackend;

export function mapBackendValidationToFrontend(errors = {}) {
  const fields = {
    title: "position",
    position: "position",
    project_description: "description",
    start_date: "startDate",
    status: "status",
    grade: "grade",
  };
  return Object.fromEntries(Object.entries(errors).map(([field, message]) => [fields[field] || field, message]));
}

export function mapPaginatedRequests(payload) {
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return {
    items: data.map(mapBackendRequestToFrontend),
    meta: {
      currentPage: payload?.current_page || 1,
      perPage: payload?.per_page || data.length || 5,
      total: payload?.total || data.length,
    },
  };
}
