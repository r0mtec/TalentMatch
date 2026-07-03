<?php

namespace App\Services\Internal;

use App\Models\Assessment;
use App\Models\Technology;
use Illuminate\Support\Facades\Http;

class AssessmentClient
{
    public function calculate(Assessment $assessment): array
    {
        $assessment->load(['customerRequest.requirements.technology', 'candidate.skills.technology']);
        $technologyAliases = $this->technologyAliases();

        $response = Http::timeout(20)->post(rtrim(env('ASSESSMENT_SERVICE_URL', 'http://assessment-service:8000'), '/').'/api/internal/assessments/calculate', [
            'assessment_id' => $assessment->id,
            'requirements' => $assessment->customerRequest->requirements->map(fn ($requirement) => [
                'id' => $requirement->id,
                'type' => $requirement->type,
                'weight' => (float) $requirement->weight,
                'technology_id' => $requirement->technology_id,
                'raw_text' => $requirement->raw_text,
                'normalized_name' => $this->normalizedRequirementName($requirement, $technologyAliases),
            ])->values()->all(),
            'skills' => $assessment->candidate->skills->map(fn ($skill) => [
                'id' => $skill->id,
                'technology_id' => $skill->technology_id,
                'normalized_name' => $skill->normalized_name,
                'raw_text' => $skill->raw_text,
                'evidence_text' => $skill->evidence_text,
            ])->values()->all(),
            'conditions' => [
                'request_grade' => $assessment->customerRequest->grade,
                'candidate_grade' => $assessment->candidate->grade,
                'request_location' => $assessment->customerRequest->location,
                'candidate_location' => $assessment->candidate->location,
                'request_citizenship' => $assessment->customerRequest->citizenship,
                'candidate_citizenship' => $assessment->candidate->citizenship,
            ],
        ]);

        $response->throw();

        return $response->json();
    }

    private function normalizedRequirementName($requirement, array $technologyAliases): ?string
    {
        $name = $requirement->technology?->name ?? $requirement->raw_text;

        if ($name === null) {
            return null;
        }

        $normalizedName = $this->normalizeTerm($name);

        return $technologyAliases[$normalizedName] ?? $normalizedName;
    }

    private function technologyAliases(): array
    {
        $aliases = [];

        Technology::query()
            ->where('is_active', true)
            ->with('synonyms')
            ->get()
            ->each(function (Technology $technology) use (&$aliases): void {
                $canonicalName = $this->normalizeTerm($technology->name);

                if ($canonicalName === '') {
                    return;
                }

                $aliases[$canonicalName] = $canonicalName;

                foreach ($technology->synonyms as $synonym) {
                    $normalizedSynonym = $this->normalizeTerm($synonym->synonym);

                    if ($normalizedSynonym !== '') {
                        $aliases[$normalizedSynonym] = $canonicalName;
                    }
                }
            });

        return $aliases;
    }

    private function normalizeTerm(string $term): string
    {
        $term = mb_strtolower($term);
        $term = preg_replace('/[^\p{L}\p{N}.+#]+/u', ' ', $term) ?? $term;
        $term = preg_replace('/\s+/u', ' ', $term) ?? $term;

        return trim($term);
    }
}
