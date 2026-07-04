<?php

namespace App\Services;

use App\Jobs\CalculateAssessmentJob;
use App\Models\Assessment;
use App\Models\Candidate;

class AssessmentRunService
{
    public function initialStatusFor(Candidate $candidate): string
    {
        if ($candidate->parsing_status === 'failed' || $candidate->recognition_status === 'failed') {
            return 'failed';
        }

        if ($candidate->recognition_status === 'done' || $candidate->skills()->exists()) {
            return 'queued';
        }

        return 'processing';
    }

    public function dispatchIfReady(Assessment $assessment, Candidate $candidate): void
    {
        if ($assessment->status !== 'queued') {
            return;
        }

        if ($candidate->parsing_status === 'failed' || $candidate->recognition_status === 'failed') {
            $assessment->update(['status' => 'failed']);

            return;
        }

        CalculateAssessmentJob::dispatch($assessment->id);
    }

    public function failWaitingAssessments(Candidate $candidate): void
    {
        $candidate->assessments()
            ->whereIn('status', ['queued', 'processing'])
            ->update(['status' => 'failed']);
    }
}
