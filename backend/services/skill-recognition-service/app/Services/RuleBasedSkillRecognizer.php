<?php

namespace App\Services;

class RuleBasedSkillRecognizer
{
    public function recognize(string $text, array $technologies = []): array
    {
        $normalizedText = $this->normalizeText($text);
        $dictionary = $this->dictionaryFromTechnologies($technologies);
        $skills = [];
        $matchedTechnologyIds = [];

        foreach ($dictionary as $technology) {
            $match = $this->findFirstMatch($normalizedText, $technology['synonyms']);

            if ($match !== null) {
                $matchedTechnologyIds[] = $technology['id'];
                $skills[] = [
                    'technology_id' => $technology['id'],
                    'normalized_name' => $technology['normalized_name'],
                    'raw_text' => $match['raw_text'],
                    'evidence_text' => $this->evidence($text, $match['raw_text']),
                    'confidence' => $this->confidence($technology['normalized_name'], $match['raw_text']),
                ];
            }
        }

        return [
            'status' => 'done',
            'skills' => $skills,
            'unrecognized_terms' => $this->unrecognizedTerms($text, $skills, $dictionary, $matchedTechnologyIds),
        ];
    }

    private function dictionaryFromTechnologies(array $technologies): array
    {
        $items = [];

        foreach ($technologies as $technology) {
            $name = trim((string) ($technology['name'] ?? ''));

            if ($name === '') {
                continue;
            }

            $items[] = [
                'id' => $technology['id'] ?? null,
                'normalized_name' => $this->normalizeTerm($name),
                'synonyms' => array_values(array_unique(array_filter([
                    $name,
                    ...($technology['synonyms'] ?? []),
                ]))),
            ];
        }

        return $items;
    }

    private function normalizeText(string $text): string
    {
        $text = mb_strtolower($text);
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/[^\p{L}\p{N}.+#]+/u', ' ', $text) ?? $text;
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
    }

    private function normalizeTerm(string $term): string
    {
        return $this->normalizeText($term);
    }

    private function findFirstMatch(string $normalizedText, array $synonyms): ?array
    {
        usort($synonyms, fn (string $left, string $right) => mb_strlen($this->normalizeTerm($right)) <=> mb_strlen($this->normalizeTerm($left)));

        foreach ($synonyms as $synonym) {
            $normalizedTerm = $this->normalizeTerm($synonym);

            if ($normalizedTerm === '') {
                continue;
            }

            if (preg_match($this->termPattern($normalizedTerm), $normalizedText) === 1) {
                return ['raw_text' => $synonym];
            }
        }

        return null;
    }

    private function termPattern(string $normalizedTerm): string
    {
        return '/(?<![\p{L}\p{N}])'.preg_quote($normalizedTerm, '/').'(?![\p{L}\p{N}])/u';
    }

    private function confidence(string $normalizedName, string $rawText): int
    {
        return $this->normalizeTerm($rawText) === $normalizedName ? 100 : 95;
    }

    private function evidence(string $text, string $term): string
    {
        $position = mb_stripos($text, $term);

        if ($position === false) {
            return $this->compactEvidence(mb_substr($text, 0, 220));
        }

        $start = max(0, $position - 90);

        return $this->compactEvidence(mb_substr($text, $start, 220));
    }

    private function compactEvidence(string $evidence): string
    {
        $evidence = str_replace(["\r\n", "\r"], "\n", $evidence);
        $evidence = preg_replace('/\s+/u', ' ', $evidence) ?? $evidence;

        return trim($evidence);
    }

    private function unrecognizedTerms(string $text, array $skills, array $dictionary, array $matchedTechnologyIds): array
    {
        $matched = array_flip(array_filter(array_map(
            fn (array $skill) => $this->normalizeTerm($skill['raw_text'] ?? ''),
            $skills,
        )));

        foreach ($dictionary as $technology) {
            if (! in_array($technology['id'], $matchedTechnologyIds, true)) {
                continue;
            }

            foreach ($technology['synonyms'] as $synonym) {
                $matched[$this->normalizeTerm($synonym)] = true;
            }
        }

        $source = $this->skillsLikeText($text);

        preg_match_all('/\b[A-Za-z][A-Za-z0-9.+#-]{1,30}\b/u', $source, $matches);

        $terms = [];

        foreach (array_count_values($matches[0] ?? []) as $term => $count) {
            $normalized = $this->normalizeTerm($term);

            if ($count < 1 || isset($matched[$normalized]) || mb_strlen($normalized) < 2 || $this->isStopTerm($normalized)) {
                continue;
            }

            $terms[] = [
                'term' => $term,
                'context' => $this->evidence($text, $term),
            ];

            if (count($terms) >= 20) {
                break;
            }
        }

        return $terms;
    }

    private function isStopTerm(string $term): bool
    {
        return in_array($term, [
            'skills',
            'skill',
            'навыки',
            'technologies',
            'technology',
            'stack',
            'experience',
            'опыт',
            'projects',
            'проекты',
            'languages',
            'языки',
        ], true);
    }

    private function skillsLikeText(string $text): string
    {
        $pattern = '/(?:^|\n)\s*(навыки|skills|technology stack|технологии)\s*:?\s*\n(?P<section>.*?)(?=\n\s*(опыт|experience|projects|проекты|языки|languages)\s*:?\s*\n|\z)/isu';

        if (preg_match($pattern, $text, $match) === 1) {
            return $match['section'];
        }

        return $text;
    }
}
