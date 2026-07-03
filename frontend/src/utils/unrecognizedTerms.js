export const ignoredTermsKey = "talentmatch_ignored_terms";
export const seenUnrecognizedTermsKey = "talentmatch_seen_unrecognized_terms";

export const termKey = (term) => String(term || "").trim().toLowerCase();

const readStorageList = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeStorageList = (key, items) => {
  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(items)).filter(Boolean)));
};

export const readIgnoredTerms = () => readStorageList(ignoredTermsKey);

export const writeIgnoredTerms = (items) => writeStorageList(ignoredTermsKey, items);

export const readSeenUnrecognizedTerms = () => readStorageList(seenUnrecognizedTermsKey);

export const writeSeenUnrecognizedTerms = (items) => writeStorageList(seenUnrecognizedTermsKey, items);

export const markUnrecognizedTermsSeen = (terms) => {
  const current = readSeenUnrecognizedTerms();
  const next = [
    ...current,
    ...terms.map((term) => termKey(typeof term === "string" ? term : term.term)),
  ];
  writeSeenUnrecognizedTerms(next);
  return Array.from(new Set(next)).filter(Boolean);
};

export const filterVisibleUnrecognizedTerms = (terms, ignoredTerms = readIgnoredTerms()) => {
  const ignored = new Set(ignoredTerms.map(termKey));
  return terms.filter((term) => !ignored.has(termKey(term.term)));
};

export const filterNewUnrecognizedTerms = (
  terms,
  ignoredTerms = readIgnoredTerms(),
  seenTerms = readSeenUnrecognizedTerms(),
) => {
  const ignored = new Set(ignoredTerms.map(termKey));
  const seen = new Set(seenTerms.map(termKey));
  return terms.filter((term) => {
    const key = termKey(term.term);
    return key && !ignored.has(key) && !seen.has(key);
  });
};
