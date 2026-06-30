<?php

namespace App\Services\Internal;

use App\Models\Candidate;
use Illuminate\Support\Facades\Http;

class SkillRecognitionClient
{
    public function recognize(Candidate $candidate): array
    {
        $response = Http::timeout(20)->post(rtrim(env('SKILL_RECOGNITION_URL', 'http://skill-recognition-service:8000'), '/').'/internal/skills/recognize', [
            'candidate_id' => $candidate->id,
            'text' => $candidate->parsed_text,
        ]);

        $response->throw();

        return $response->json();
    }
}
