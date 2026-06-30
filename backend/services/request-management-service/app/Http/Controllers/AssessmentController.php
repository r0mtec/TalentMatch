<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesUser;
use App\Http\Requests\StoreAssessmentRequest;
use App\Jobs\CalculateAssessmentJob;
use App\Models\Assessment;
use App\Models\Candidate;
use App\Models\CustomerRequest;
use App\Services\AuditLogService;
use App\Services\Internal\ReportClient;
use App\Support\RussianValidation;
use Illuminate\Http\Request;

class AssessmentController extends Controller
{
    use ResolvesUser;

    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly ReportClient $reportClient,
    )
    {
    }

    public function store(StoreAssessmentRequest $request)
    {
        $data = $request->validated();
        $runNumber = ((int) Assessment::query()
            ->where('request_id', $data['request_id'])
            ->where('candidate_id', $data['candidate_id'])
            ->max('run_number')) + 1;

        $candidate = Candidate::findOrFail($data['candidate_id']);
        $assessment = Assessment::create([
            'request_id' => $data['request_id'],
            'candidate_id' => $data['candidate_id'],
            'run_number' => $runNumber,
            'status' => $candidate->recognition_status === 'done' ? 'queued' : 'processing',
        ]);

        if ($candidate->recognition_status === 'done') {
            CalculateAssessmentJob::dispatch($assessment->id);
        }

        $this->auditLog->log('assessment.started', 'assessment', $assessment->id, [
            'request_id' => $assessment->request_id,
            'candidate_id' => $assessment->candidate_id,
            'run_number' => $assessment->run_number,
        ], $this->currentUserId());

        return response()->json($assessment, 202);
    }

    public function show(Assessment $assessment)
    {
        return response()->json($assessment->load(['candidate', 'customerRequest', 'requirementResults.requirement.technology', 'requirementResults.matchedSkill']));
    }

    public function forRequest(CustomerRequest $request)
    {
        return response()->json(
            $request->assessments()->with('candidate')->latest()->get()
        );
    }

    public function compareCandidates(Request $httpRequest, CustomerRequest $request)
    {
        $data = $httpRequest->validate([
            'candidate_ids' => ['required', 'array', 'min:1'],
            'candidate_ids.*' => ['uuid', 'exists:candidates,id'],
        ], RussianValidation::messages(), RussianValidation::attributes());

        $items = Assessment::query()
            ->where('request_id', $request->id)
            ->whereIn('candidate_id', $data['candidate_ids'])
            ->with('candidate')
            ->orderByDesc('run_number')
            ->get()
            ->unique('candidate_id')
            ->values();

        return response()->json(['request_id' => $request->id, 'items' => $items]);
    }

    public function report(Assessment $assessment)
    {
        $this->auditLog->log('assessment.report_exported', 'assessment', $assessment->id, [], $this->currentUserId());

        return response($this->reportClient->assessmentPdf($assessment), 200)->header('Content-Type', 'application/pdf');
    }

    public function comparisonReport(CustomerRequest $request)
    {
        $this->auditLog->log('request.comparison_report_exported', 'request', $request->id, [], $this->currentUserId());

        return response($this->reportClient->comparisonPdf($request), 200)->header('Content-Type', 'application/pdf');
    }
}
