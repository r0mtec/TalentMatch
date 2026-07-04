import { decodeMimeEncodedWord } from "./formatters.js";

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

const decodedText = (value) => cleanNameLine(decodeMimeEncodedWord(value));

const isSectionStart = (value) => sectionStarts.some((pattern) => pattern.test(value));

const isStillMimeEncoded = (value) => /=\?[^?]+\?[bq]\?[^?]*\?=/i.test(String(value || ""));

const normalizeComparable = (value) =>
  decodedText(value).replace(/\s+/g, " ").toLowerCase();

const looksLikeNamePart = (value) => {
  const text = decodedText(value);
  if (!text || isSectionStart(text)) return false;
  if (/[@/\\]|https?:|www\.|[0-9]{2,}/i.test(text)) return false;
  return /[a-zа-яё]/i.test(text);
};

const normalizeName = (value) => {
  const text = decodedText(value);
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
    const line = decodedText(lines[index]);
    if (!/^(фио|ф\.и\.о\.|full name|name)(?:\s|:|$)/i.test(line)) continue;

    const parts = [];
    const sameLineValue = decodedText(line.replace(/^(фио|ф\.и\.о\.|full name|name)\s*:?\s*/i, ""));
    if (sameLineValue && looksLikeNamePart(sameLineValue)) parts.push(sameLineValue);

    for (let cursor = index + 1; cursor < lines.length && parts.length < 4; cursor += 1) {
      const nextLine = decodedText(lines[cursor]);
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

export function isUsableCandidateName(value, fileName = "") {
  const name = decodedText(value);
  if (!name) return false;
  if (isStillMimeEncoded(name)) return false;
  if (/^резюме$/i.test(name)) return false;
  if (fileName && normalizeComparable(name) === normalizeComparable(fileName)) return false;
  if (/\.(pdf|doc|docx|rtf|txt)$/i.test(name)) return false;
  return true;
}

export function getCandidateNameFromFields(candidate = {}) {
  const fileName = candidate.original_file_name || candidate.fileName || candidate.file_name || "";
  const fieldsByPriority = [
    candidate.display_name,
    candidate.fio,
    candidate.full_name,
    candidate.displayName,
    candidate.fullName,
    candidate.name,
  ];

  return fieldsByPriority
    .map(decodedText)
    .find((value) => isUsableCandidateName(value, fileName)) || "";
}

export function getCandidateDisplayName(candidate = {}) {
  const fileName = candidate.original_file_name || candidate.fileName || candidate.file_name || "";
  const fieldName = getCandidateNameFromFields(candidate);
  if (fieldName) return fieldName;

  const extractedName = extractCandidateNameFromText(candidate.recognized_text || candidate.parsed_text || "");
  if (isUsableCandidateName(extractedName, fileName)) return extractedName;

  const normalizedFileName = decodedText(fileName);
  if (normalizedFileName) return `Резюме: ${normalizedFileName}`;

  return "Кандидат без имени";
}
