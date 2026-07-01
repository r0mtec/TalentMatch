<?php

namespace App\Jobs;

use App\Models\Assessment;
use App\Models\AssessmentRequirementResult;
use App\Services\AuditLogService;
use App\Services\Internal\AssessmentClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class CalculateAssessmentJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $assessmentId)
    {
    }

    public function handle(AssessmentClient $client): void
    {
        $assessment = Assessment::findOrFail($this->assessmentId);
        $assessment->update(['status' => 'processing']);

        try {
            $result = $client->calculate($assessment);

            DB::transaction(function () use ($assessment, $result): void {
                $assessment->update([
                    'must_score' => $result['must_score'] ?? 0,
                    'nice_score' => $result['nice_score'] ?? 0,
                    'total_score' => $result['total_score'] ?? 0,
                    'has_missing_must_requirements' => $result['has_missing_must_requirements'] ?? false,
                    'grade_match_status' => $result['grade_match_status'] ?? 'unknown',
                    'location_match_status' => $result['location_match_status'] ?? 'unknown',
                    'citizenship_match_status' => $result['citizenship_match_status'] ?? 'unknown',
                    'status' => $result['status'] ?? 'done',
                    'calculated_at' => now(),
                ]);

                AssessmentRequirementResult::query()
                    ->where('assessment_id', $assessment->id)
                    ->delete();

                foreach ($result['requirement_results'] ?? [] as $item) {
                    AssessmentRequirementResult::create([
                        'assessment_id' => $assessment->id,
                        'requirement_id' => $item['requirement_id'],
                        'matched_candidate_skill_id' => $item['matched_candidate_skill_id'] ?? null,
                        'is_matched' => $item['is_matched'] ?? false,
                        'evidence_text' => $item['evidence_text'] ?? null,
                        'score_contribution' => $item['score_contribution'] ?? 0,
                        'comment' => $item['comment'] ?? null,
                    ]);
                }
            });

            app(AuditLogService::class)->log('assessment.completed', 'assessment', $assessment->id, [
                'request_id' => $assessment->request_id,
                'candidate_id' => $assessment->candidate_id,
                'total_score' => $assessment->refresh()->total_score,
            ]);
        } catch (\Throwable $exception) {
            $assessment->update(['status' => 'failed']);

            throw $exception;
        }
    }
}
