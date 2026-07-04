<?php

namespace App\Jobs;

use App\Models\Candidate;
use App\Models\CandidateSkill;
use App\Models\UnrecognizedTerm;
use App\Services\AssessmentRunService;
use App\Services\Internal\SkillRecognitionClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

class RecognizeCandidateSkillsJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $candidateId)
    {
    }

    public function handle(SkillRecognitionClient $client, AssessmentRunService $assessmentRuns): void
    {
        $candidate = Candidate::findOrFail($this->candidateId);
        $candidate->update(['recognition_status' => 'processing']);

        try {
            $result = $client->recognize($candidate);

            CandidateSkill::query()
                ->where('candidate_id', $candidate->id)
                ->where('is_manual', false)
                ->delete();

            foreach ($result['skills'] ?? [] as $skill) {
                CandidateSkill::create([
                    'candidate_id' => $candidate->id,
                    'technology_id' => $skill['technology_id'] ?? null,
                    'normalized_name' => $skill['normalized_name'] ?? Str::lower($skill['raw_text'] ?? $skill['name'] ?? ''),
                    'raw_text' => $skill['raw_text'] ?? $skill['name'] ?? '',
                    'evidence_text' => $skill['evidence_text'] ?? null,
                    'confidence' => $skill['confidence'] ?? 100,
                    'is_manual' => false,
                ]);
            }

            foreach ($result['unrecognized_terms'] ?? [] as $term) {
                $termText = trim((string) ($term['term'] ?? $term));

                if ($termText === '') {
                    continue;
                }

                $exists = UnrecognizedTerm::query()
                    ->where('candidate_id', $candidate->id)
                    ->where('term', $termText)
                    ->where('status', 'new')
                    ->exists();

                if ($exists) {
                    continue;
                }

                UnrecognizedTerm::create([
                    'candidate_id' => $candidate->id,
                    'term' => $termText,
                    'context' => is_array($term) ? ($term['context'] ?? null) : null,
                    'status' => 'new',
                ]);
            }

            $candidate->update(['recognition_status' => 'done']);

            $candidate->assessments()
                ->where('status', 'processing')
                ->each(function ($assessment): void {
                    $assessment->update(['status' => 'queued']);
                    CalculateAssessmentJob::dispatch($assessment->id);
                });
        } catch (\Throwable $exception) {
            $candidate->update(['recognition_status' => 'failed']);
            $assessmentRuns->failWaitingAssessments($candidate);

            throw $exception;
        }
    }
}
