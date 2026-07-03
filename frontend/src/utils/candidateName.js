const sectionStarts = [
  /^backend\b/i,
  /^frontend\b/i,
  /^fullstack\b/i,
  /^full stack\b/i,
  /^developer\b/i,
  /^разработчик/i,
  /^ключевые навыки/i,
  /^навыки/i,
  /^опыт/i,
  /^проекты/i,
  /^технологии/i,
  /^образование/i,
  /^контакты/i,
  /^summary\b/i,
  /^skills\b/i,
  /^experience\b/i,
  /^projects\b/i,
];

const cleanNameLine = (value) =>
  String(value || "")
    .replace(/^[\s:•\-–—]+/, "")
    .replace(/[\s:•\-–—]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

const isSectionStart = (value) => sectionStarts.some((pattern) => pattern.test(value));

const looksLikeNamePart = (value) => {
  const text = cleanNameLine(value);
  if (!text || isSectionStart(text)) return false;
  if (/[@/\\]|https?:|www\.|[0-9]{2,}/i.test(text)) return false;
  return /[a-zа-яё]/i.test(text);
};

const normalizeName = (value) => {
  const text = cleanNameLine(value);
  if (!text || isSectionStart(text)) return "";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return "";
  return words.join(" ");
};

export function extractCandidateNameFromText(recognizedText) {
  const lines = String(recognizedText || "")
    .replace(/\r/g, "")
    .split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = cleanNameLine(lines[index]);
    if (!/^фио(?:\s|:|$)/i.test(line)) continue;

    const parts = [];
    const sameLineValue = cleanNameLine(line.replace(/^фио\s*:?\s*/i, ""));
    if (sameLineValue && looksLikeNamePart(sameLineValue)) parts.push(sameLineValue);

    for (let cursor = index + 1; cursor < lines.length && parts.length < 4; cursor += 1) {
      const nextLine = cleanNameLine(lines[cursor]);
      if (!nextLine) continue;
      if (isSectionStart(nextLine)) break;
      if (!looksLikeNamePart(nextLine)) break;
      parts.push(nextLine);
    }

    const name = normalizeName(parts.join(" "));
    if (name) return name;
  }

  return "";
}

export function getCandidateNameFromFields(candidate = {}) {
  return cleanNameLine(
    candidate.fio
    || candidate.full_name
    || candidate.fullName
    || candidate.name
    || candidate.display_name
    || candidate.displayName
    || "",
  );
}

export function isUsableCandidateName(value, fileName = "") {
  const name = cleanNameLine(value);
  if (!name) return false;
  if (/^резюме$/i.test(name)) return false;
  if (fileName && name === fileName) return false;
  if (/\.(pdf|docx)$/i.test(name)) return false;
  return true;
}
