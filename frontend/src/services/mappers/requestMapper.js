const statusToBackend = { active: "active", draft: "draft", closed: "closed" };
const statusFromBackend = { active: "active", draft: "draft", closed: "closed" };
const missingCompanyLabel = "Не указана";

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

const requirementKey = (requirement, defaultType) => {
  const type = requirement.type || defaultType;
  const text = String(requirement.raw_text || requirement.title || requirement.name || "").trim().toLowerCase();
  return `${type}:${requirement.technology_id || requirement.technologyId || ""}:${text || requirement.id || ""}`;
};

const uniqueRequirements = (items, defaultType, requestId) => {
  const seen = new Set();
  return items.reduce((acc, item) => {
    const key = requirementKey(item, defaultType);
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.push(normalizeRequirement(item, defaultType, requestId));
    return acc;
  }, []);
};

const normalizeCompanyName = (value) => {
  const text = String(value || "").trim();
  return text === missingCompanyLabel ? "" : text;
};

const companyValue = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return normalizeCompanyName(value.company_name || value.companyName || value.name || value.title || "");
  }
  return normalizeCompanyName(value);
};

const resolveCompanyName = (request) => [
  request?.company_name,
  request?.companyName,
  request?.company,
  request?.customer_name,
  request?.customerName,
  request?.customer,
  request?.client_name,
  request?.clientName,
  request?.client,
  request?.organization,
  request?.organisation,
].map(companyValue).find(Boolean) || "";

export function mapBackendRequestToFrontend(payload) {
  const request = payload?.data || payload;
  const requirements = request?.requirements || [];
  const companyName = resolveCompanyName(request);
  const mustHave = uniqueRequirements([
    ...(request?.must_have || []),
    ...requirements.filter((item) => item.type === "must"),
  ], "must", request?.id);
  const niceToHave = uniqueRequirements([
    ...(request?.nice_to_have || []),
    ...requirements.filter((item) => item.type === "nice"),
  ], "nice", request?.id);

  return {
    id: request?.id,
    companyName: companyName || missingCompanyLabel,
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
    company_name: normalizeCompanyName(form.companyName) || null,
    position: form.position || form.post || form.title || "",
    project_description: form.description || "",
    grade: form.grade || null,
    location: form.location || null,
    citizenship: form.citizenship || null,
    workload: form.workload || null,
    start_date: form.startDate || form.employment_date || null,
    status: statusToBackend[status || form.status] || status || form.status || "draft",
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
  const seen = new Set();
  return [
    ...mustHave.map((requirement) => ({ requirement, type: "must" })),
    ...niceToHave.map((requirement) => ({ requirement, type: "nice" })),
  ].reduce((acc, { requirement, type }) => {
    const rawText = String(requirement.raw_text || requirement.title || requirement.name || "").trim();
    const key = `${type}:${requirement.technology_id || requirement.technologyId || ""}:${rawText.toLowerCase()}`;
    if (!rawText && !isValidUuid(requirement.technology_id || requirement.technologyId)) return acc;
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.push(mapRequirementToBackend({ ...requirement, raw_text: rawText, title: rawText || requirement.title }, type));
    return acc;
  }, []);
}

export const mapFrontendRequirementToBackend = mapRequirementToBackend;

export function mapBackendValidationToFrontend(errors = {}) {
  const fields = {
    title: "position",
    company_name: "companyName",
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
