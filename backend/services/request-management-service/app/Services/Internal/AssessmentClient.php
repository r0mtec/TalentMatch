<?php

namespace App\Services\Internal;

use App\Models\Assessment;
use Illuminate\Support\Facades\Http;

class AssessmentClient
{
    public function calculate(Assessment $assessment): array
    {
        $assessment->load(['customerRequest.requirements.technology', 'candidate.skills.technology']);

        $response = Http::timeout(20)->post(rtrim(env('ASSESSMENT_SERVICE_URL', 'http://assessment-service:8000'), '/').'/internal/assessments/calculate', [
            'assessment_id' => $assessment->id,
            'request' => $assessment->customerRequest,
            'candidate' => $assessment->candidate,
        ]);

        $response->throw();

        return $response->json();
    }
}
