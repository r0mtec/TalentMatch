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
        $assessment = $this->createAssessment($data['request_id'], $data['candidate_id']);

        return response()->json($assessment, 202);
    }

    public function storeForRequest(CustomerRequest $request, Candidate $candidate)
    {
        $assessment = $this->createAssessment($request->id, $candidate->id);

        return response()->json($assessment, 202);
    }

    private function createAssessment(string $requestId, string $candidateId): Assessment
    {
        $runNumber = ((int) Assessment::query()
            ->where('request_id', $requestId)
            ->where('candidate_id', $candidateId)
            ->max('run_number')) + 1;

        $candidate = Candidate::findOrFail($candidateId);
        $canCalculateNow = $candidate->recognition_status === 'done' || $candidate->skills()->exists();

        $assessment = Assessment::create([
            'request_id' => $requestId,
            'candidate_id' => $candidateId,
            'run_number' => $runNumber,
            'status' => $canCalculateNow ? 'queued' : 'processing',
        ]);

        if ($canCalculateNow) {
            CalculateAssessmentJob::dispatch($assessment->id);
        }

        $this->auditLog->log('assessment.started', 'assessment', $assessment->id, [
            'request_id' => $assessment->request_id,
            'candidate_id' => $assessment->candidate_id,
            'run_number' => $assessment->run_number,
        ], $this->currentUserId());

        return $assessment;
    }

    public function show(Assessment $assessment)
    {
        return response()->json($assessment->load(['candidate', 'customerRequest', 'requirementResults.requirement.technology', 'requirementResults.matchedSkill']));
    }

    public function forRequest(Request $httpRequest, CustomerRequest $request)
    {
        $query = $request->assessments()->with('candidate');

        $query->when($httpRequest->filled('status'), fn ($q) => $q->where('status', $httpRequest->input('status')));

        match ($httpRequest->input('sort', 'created_at_desc')) {
            'total_score_desc' => $query->orderByDesc('total_score'),
            'total_score_asc' => $query->orderBy('total_score'),
            'must_score_desc' => $query->orderByDesc('must_score'),
            default => $query->latest(),
        };

        return response()->json($query->get());
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
            ->sortByDesc(fn (Assessment $assessment) => (float) $assessment->total_score)
            ->values();

        return response()->json([
            'request_id' => $request->id,
            'items' => $items->map(fn (Assessment $assessment) => [
                'candidate' => $assessment->candidate,
                'assessment_id' => $assessment->id,
                'total_score' => $assessment->total_score,
                'must_score' => $assessment->must_score,
                'nice_score' => $assessment->nice_score,
                'has_missing_must_requirements' => $assessment->has_missing_must_requirements,
                'grade_match_status' => $assessment->grade_match_status,
                'location_match_status' => $assessment->location_match_status,
                'citizenship_match_status' => $assessment->citizenship_match_status,
                'calculated_at' => $assessment->calculated_at,
            ])->values(),
        ]);
    }

    public function report(Assessment $assessment)
    {
        if ($assessment->status !== 'done' || $assessment->calculated_at === null) {
            return response()->json([
                'message' => 'Отчет доступен только после завершения оценки.',
                'status' => $assessment->status,
            ], 409);
        }

        $this->auditLog->log('assessment.report_exported', 'assessment', $assessment->id, [], $this->currentUserId());

        return response($this->reportClient->assessmentPdf($assessment), 200)->header('Content-Type', 'application/pdf');
    }

    public function comparisonReport(CustomerRequest $request)
    {
        $this->auditLog->log('request.comparison_report_exported', 'request', $request->id, [], $this->currentUserId());

        return response($this->reportClient->comparisonPdf($request), 200)->header('Content-Type', 'application/pdf');
    }
}
