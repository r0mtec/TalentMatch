<?php

namespace App\Services\Internal;

use App\Models\Assessment;
use App\Models\CustomerRequest;
use Illuminate\Support\Facades\Http;

class ReportClient
{
    public function assessmentPdf(Assessment $assessment): string
    {
        $response = Http::timeout(20)->post(rtrim(env('REPORT_SERVICE_URL', 'http://report-service:8000'), '/').'/internal/reports/assessment.pdf', [
            'assessment_id' => $assessment->id,
        ]);

        $response->throw();

        return $response->body();
    }

    public function comparisonPdf(CustomerRequest $request): string
    {
        $response = Http::timeout(20)->post(rtrim(env('REPORT_SERVICE_URL', 'http://report-service:8000'), '/').'/internal/reports/comparison.pdf', [
            'request_id' => $request->id,
        ]);

        $response->throw();

        return $response->body();
    }
}
