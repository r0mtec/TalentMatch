<?php

namespace App\Services;

class CoverageCalculator
{
    public function calculate(array $payload): array
    {
        $requirements = $payload['requirements'] ?? [];
        $skills = $payload['skills'] ?? [];
        $conditions = $payload['conditions'] ?? [];
        $results = [];
        $totalWeight = 0.0;
        $matchedWeight = 0.0;
        $mustWeight = 0.0;
        $matchedMustWeight = 0.0;
        $niceWeight = 0.0;
        $matchedNiceWeight = 0.0;

        foreach ($requirements as $requirement) {
            $weight = (float) ($requirement['weight'] ?? 1);
            $type = $requirement['type'] ?? 'must';
            $matchedSkill = $this->matchRequirement($requirement, $skills);
            $matched = $matchedSkill !== null;

            $totalWeight += $weight;
            $matchedWeight += $matched ? $weight : 0;

            if ($type === 'must') {
                $mustWeight += $weight;
                $matchedMustWeight += $matched ? $weight : 0;
            } else {
                $niceWeight += $weight;
                $matchedNiceWeight += $matched ? $weight : 0;
            }

            $results[] = [
                'requirement_id' => $requirement['id'] ?? null,
                'matched_candidate_skill_id' => $matchedSkill['id'] ?? null,
                'is_matched' => $matched,
                'score_contribution' => $matched ? $weight : 0,
                'evidence_text' => $matchedSkill['evidence_text'] ?? null,
                'comment' => $matched
                    ? 'Закрыто по навыку '.$this->displaySkill($matchedSkill)
                    : 'Требование не найдено в навыках кандидата',
            ];
        }

        return [
            'status' => 'done',
            'must_score' => $this->percent($matchedMustWeight, $mustWeight),
            'nice_score' => $this->percent($matchedNiceWeight, $niceWeight),
            'total_score' => $this->percent($matchedWeight, $totalWeight),
            'has_missing_must_requirements' => $matchedMustWeight < $mustWeight,
            'grade_match_status' => $this->matchStatus($conditions['request_grade'] ?? null, $conditions['candidate_grade'] ?? null),
            'location_match_status' => $this->matchStatus($conditions['request_location'] ?? null, $conditions['candidate_location'] ?? null),
            'citizenship_match_status' => $this->matchStatus($conditions['request_citizenship'] ?? null, $conditions['candidate_citizenship'] ?? null),
            'requirement_results' => $results,
        ];
    }

    private function matchRequirement(array $requirement, array $skills): ?array
    {
        $requirementTechnologyId = $this->filledString($requirement['technology_id'] ?? null);

        if ($requirementTechnologyId !== null) {
            foreach ($skills as $skill) {
                if ($requirementTechnologyId === $this->filledString($skill['technology_id'] ?? null)) {
                    return $skill;
                }
            }
        }

        $requirementTerms = $this->termsFor($requirement);

        if ($requirementTerms === []) {
            return null;
        }

        foreach ($skills as $skill) {
            $skillTerms = $this->termsFor($skill);

            foreach ($requirementTerms as $requirementTerm) {
                foreach ($skillTerms as $skillTerm) {
                    if ($this->termsMatch($requirementTerm, $skillTerm)) {
                        return $skill;
                    }
                }
            }
        }

        return null;
    }

    private function displaySkill(?array $skill): string
    {
        $value = $skill['raw_text'] ?? $skill['normalized_name'] ?? null;

        return $this->filledString($value) ?? 'кандидата';
    }

    private function termsFor(array $item): array
    {
        $terms = [];

        foreach (['normalized_name', 'raw_text'] as $field) {
            $term = $this->normalizeTerm($item[$field] ?? null);

            if ($term !== null) {
                $terms[] = $term;
            }
        }

        return array_values(array_unique($terms));
    }

    private function termsMatch(string $requirementTerm, string $skillTerm): bool
    {
        if ($requirementTerm === $skillTerm) {
            return true;
        }

        return preg_match($this->termPattern($skillTerm), $requirementTerm) === 1
            || preg_match($this->termPattern($requirementTerm), $skillTerm) === 1;
    }

    private function termPattern(string $term): string
    {
        return '/(?<![\p{L}\p{N}])'.preg_quote($term, '/').'(?![\p{L}\p{N}])/u';
    }

    private function normalizeTerm(mixed $value): ?string
    {
        $value = $this->filledString($value);

        if ($value === null) {
            return null;
        }

        $value = mb_strtolower($value);
        $value = preg_replace('/[^\p{L}\p{N}.+#]+/u', ' ', $value) ?? $value;
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private function filledString(mixed $value): ?string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function matchStatus(mixed $requestValue, mixed $candidateValue): string
    {
        $requestValue = $this->normalizeCondition($requestValue);
        $candidateValue = $this->normalizeCondition($candidateValue);

        if ($requestValue === null || $candidateValue === null) {
            return 'unknown';
        }

        return $requestValue === $candidateValue ? 'matches' : 'does_not_match';
    }

    private function normalizeCondition(mixed $value): ?string
    {
        $value = $this->filledString($value);

        if ($value === null) {
            return null;
        }

        $value = mb_strtolower($value);
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    private function percent(float $matchedWeight, float $totalWeight): float
    {
        return $totalWeight <= 0.0 ? 0 : round($matchedWeight / $totalWeight * 100, 2);
    }
}
