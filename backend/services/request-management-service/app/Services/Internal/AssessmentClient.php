<?php

namespace App\Services\Internal;

use App\Models\Assessment;
use Illuminate\Support\Facades\Http;

class AssessmentClient
{
    public function calculate(Assessment $assessment): array
    {
        $assessment->load(['customerRequest.requirements.technology', 'candidate.skills.technology']);

        $response = Http::timeout(20)->post(rtrim(env('ASSESSMENT_SERVICE_URL', 'http://assessment-service:8000'), '/').'/api/internal/assessments/calculate', [
            'assessment_id' => $assessment->id,
            'requirements' => $assessment->customerRequest->requirements->map(fn ($requirement) => [
                'id' => $requirement->id,
                'type' => $requirement->type,
                'weight' => (float) $requirement->weight,
                'technology_id' => $requirement->technology_id,
                'raw_text' => $requirement->raw_text,
                'normalized_name' => $this->normalizedRequirementName($requirement),
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

    private function normalizedRequirementName($requirement): ?string
    {
        $name = $requirement->technology?->name ?? $requirement->raw_text;

        return $name === null ? null : mb_strtolower(trim($name));
    }
}
