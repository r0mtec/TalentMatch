<?php

namespace App\Services\Internal;

use App\Models\Assessment;
use App\Models\CustomerRequest;
use Illuminate\Support\Facades\Http;

class ReportClient
{
    public function assessmentPdf(Assessment $assessment): string
    {
        $assessment->load(['candidate', 'customerRequest', 'requirementResults.requirement.technology', 'requirementResults.matchedSkill']);

        $response = Http::timeout(20)->post(rtrim(env('REPORT_SERVICE_URL', 'http://report-service:8000'), '/').'/api/internal/reports/assessment', [
            'assessment' => $this->assessmentPayload($assessment),
        ]);

        $response->throw();

        return $response->body();
    }

    public function comparisonPdf(CustomerRequest $request): string
    {
        $request->load('assessments.candidate');

        $assessments = $request->assessments()
            ->with(['candidate', 'requirementResults.requirement', 'requirementResults.matchedSkill'])
            ->orderByDesc('run_number')
            ->get()
            ->unique('candidate_id')
            ->sortByDesc(fn (Assessment $assessment) => (float) $assessment->total_score)
            ->values();

        $response = Http::timeout(20)->post(rtrim(env('REPORT_SERVICE_URL', 'http://report-service:8000'), '/').'/api/internal/reports/comparison', [
            'request' => [
                'id' => $request->id,
                'title' => $request->title,
                'position' => $request->position,
                'grade' => $request->grade,
                'location' => $request->location,
                'citizenship' => $request->citizenship,
                'status' => $request->status,
            ],
            'assessments' => $assessments->map(fn (Assessment $assessment) => $this->assessmentPayload($assessment))->all(),
        ]);

        $response->throw();

        return $response->body();
    }

    private function assessmentPayload(Assessment $assessment): array
    {
        return [
            'id' => $assessment->id,
            'run_number' => $assessment->run_number,
            'status' => $assessment->status,
            'must_score' => (float) $assessment->must_score,
            'nice_score' => (float) $assessment->nice_score,
            'total_score' => (float) $assessment->total_score,
            'has_missing_must_requirements' => (bool) $assessment->has_missing_must_requirements,
            'grade_match_status' => $assessment->grade_match_status,
            'location_match_status' => $assessment->location_match_status,
            'citizenship_match_status' => $assessment->citizenship_match_status,
            'calculated_at' => $assessment->calculated_at?->toISOString(),
            'request' => [
                'id' => $assessment->customerRequest?->id,
                'title' => $assessment->customerRequest?->title,
                'position' => $assessment->customerRequest?->position,
                'grade' => $assessment->customerRequest?->grade,
                'location' => $assessment->customerRequest?->location,
                'citizenship' => $assessment->customerRequest?->citizenship,
                'status' => $assessment->customerRequest?->status,
            ],
            'candidate' => [
                'id' => $assessment->candidate?->id,
                'display_name' => $assessment->candidate?->display_name,
                'grade' => $assessment->candidate?->grade,
                'location' => $assessment->candidate?->location,
                'citizenship' => $assessment->candidate?->citizenship,
                'languages' => $assessment->candidate?->languages,
            ],
            'requirement_results' => $assessment->requirementResults->map(fn ($result) => [
                'requirement_id' => $result->requirement_id,
                'requirement_type' => $result->requirement?->type,
                'requirement_weight' => $result->requirement?->weight === null ? null : (float) $result->requirement->weight,
                'requirement_text' => $result->requirement?->technology?->name ?? $result->requirement?->raw_text,
                'matched_candidate_skill_id' => $result->matched_candidate_skill_id,
                'matched_skill' => $result->matchedSkill?->raw_text,
                'is_matched' => (bool) $result->is_matched,
                'evidence_text' => $result->evidence_text,
                'score_contribution' => (float) $result->score_contribution,
                'comment' => $result->comment,
            ])->values()->all(),
        ];
    }
}
