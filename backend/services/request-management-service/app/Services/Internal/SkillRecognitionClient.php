<?php

namespace App\Services\Internal;

use App\Models\Candidate;
use App\Models\Technology;
use Illuminate\Support\Facades\Http;

class SkillRecognitionClient
{
    public function recognize(Candidate $candidate): array
    {
        $response = Http::timeout(20)->post(rtrim(env('SKILL_RECOGNITION_URL', 'http://skill-recognition-service:8000'), '/').'/api/internal/skills/recognize', [
            'candidate_id' => $candidate->id,
            'plain_text' => $candidate->parsed_text,
            'technologies' => Technology::query()
                ->where('is_active', true)
                ->with('synonyms')
                ->get()
                ->map(fn (Technology $technology) => [
                    'id' => $technology->id,
                    'name' => $technology->name,
                    'group_name' => $technology->group_name,
                    'synonyms' => $technology->synonyms->pluck('synonym')->values()->all(),
                ])
                ->values()
                ->all(),
        ]);

        $response->throw();

        return $response->json();
    }
}
