<?php

namespace App\Services;

class CoverageCalculator
{
    public function calculate(array $payload): array
    {
        $requirements = $payload['requirements'] ?? [];
        $skills = collect($payload['skills'] ?? [])->pluck('normalized_name')->map(fn ($name) => mb_strtolower($name))->all();
        $results = [];
        $totalWeight = 0;
        $matchedWeight = 0;
        $mustWeight = 0;
        $matchedMustWeight = 0;
        $niceWeight = 0;
        $matchedNiceWeight = 0;

        foreach ($requirements as $requirement) {
            $weight = (int) ($requirement['weight'] ?? 1);
            $type = $requirement['type'] ?? 'must';
            $needle = mb_strtolower($requirement['normalized_name'] ?? $requirement['raw_text'] ?? '');
            $matched = in_array($needle, $skills, true);

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
                'is_matched' => $matched,
                'score_contribution' => $matched ? $weight : 0,
                'evidence_text' => $matched ? 'Evidence should be copied from candidate_skills.evidence_text' : null,
            ];
        }

        return [
            'status' => 'done',
            'must_score' => $this->percent($matchedMustWeight, $mustWeight),
            'nice_score' => $this->percent($matchedNiceWeight, $niceWeight),
            'total_score' => $this->percent($matchedWeight, $totalWeight),
            'has_missing_must_requirements' => $matchedMustWeight < $mustWeight,
            'requirement_results' => $results,
        ];
    }

    private function percent(int $matchedWeight, int $totalWeight): float
    {
        return $totalWeight === 0 ? 0 : round($matchedWeight / $totalWeight * 100, 2);
    }
}
