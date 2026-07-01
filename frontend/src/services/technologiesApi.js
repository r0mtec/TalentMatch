import { apiRequest } from "./apiClient.js";

const groupToBackend = {
  languages: "languages",
  frameworks: "frameworks",
  databases: "databases",
  infrastructure: "infrastructure",
  other: "other",
};
const groupFromBackend = {
  languages: "languages",
  frameworks: "frameworks",
  databases: "databases",
  infrastructure: "infrastructure",
  other: "other",
};

const normalizeSynonym = (item) => (typeof item === "string" ? { id: item, synonym: item } : { id: item.id, synonym: item.synonym });

const normalizeTechnology = (technology) => {
  const synonymItems = (technology.synonyms || technology.technology_synonyms || []).map(normalizeSynonym);
  return {
    id: technology.id,
    name: technology.name,
    group: groupFromBackend[technology.group_name] || groupFromBackend[technology.group] || technology.group || "other",
    synonyms: synonymItems.map((item) => item.synonym),
    synonymItems,
    is_active: technology.is_active ?? true,
  };
};

export async function getTechnologies(params = {}) {
  const payload = await apiRequest("/technologies", { query: params });
  const data = Array.isArray(payload) ? payload : payload?.data || [];
  return data.map(normalizeTechnology);
}

export async function createTechnology(payload) {
  const created = await apiRequest("/technologies", {
    method: "POST",
    body: {
      name: payload.name,
      group_name: groupToBackend[payload.group] || payload.group || "other",
      is_active: payload.is_active ?? true,
    },
  });
  return normalizeTechnology(created?.data || created);
}

export async function updateTechnology(id, payload) {
  const updated = await apiRequest(`/technologies/${id}`, {
    method: "PATCH",
    body: {
      name: payload.name,
      group_name: groupToBackend[payload.group] || payload.group || "other",
      is_active: payload.is_active ?? true,
    },
  });
  return normalizeTechnology(updated?.data || updated);
}

export async function deleteTechnology(id) {
  return apiRequest(`/technologies/${id}`, { method: "DELETE" });
}

export async function addTechnologySynonym(id, synonym) {
  return apiRequest(`/technologies/${id}/synonyms`, {
    method: "POST",
    body: { synonym },
  });
}

export async function deleteTechnologySynonym(id) {
  return apiRequest(`/technology-synonyms/${id}`, { method: "DELETE" });
}
