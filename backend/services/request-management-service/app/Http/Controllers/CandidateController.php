<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesUser;
use App\Http\Requests\StoreCandidateSkillRequest;
use App\Http\Requests\UploadCandidateResumeRequest;
use App\Models\Assessment;
use App\Models\Candidate;
use App\Models\CandidateSkill;
use App\Models\CustomerRequest;
use App\Services\AssessmentRunService;
use App\Services\AuditLogService;
use App\Services\ResumeUploadService;
use App\Support\RussianValidation;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CandidateController extends Controller
{
    use ResolvesUser;

    public function __construct(
        private readonly ResumeUploadService $resumeUploadService,
        private readonly AuditLogService $auditLog,
        private readonly AssessmentRunService $assessmentRuns,
    )
    {
    }

    public function index(Request $request)
    {
        $query = Candidate::query()->latest();

        $query->when($request->filled('q'), function ($q) use ($request): void {
            $term = '%'.$request->input('q').'%';
            $q->where(function ($nested) use ($term): void {
                $nested->where('display_name', 'ilike', $term)
                    ->orWhere('original_file_name', 'ilike', $term)
                    ->orWhere('parsed_text', 'ilike', $term);
            });
        });
        $query->when($request->filled('technology_id'), fn ($q) => $q->whereHas('skills', fn ($skills) => $skills->where('technology_id', $request->input('technology_id'))));
        $query->when($request->filled('technology_ids'), function ($q) use ($request): void {
            $ids = array_filter((array) $request->input('technology_ids'));
            $q->whereHas('skills', fn ($skills) => $skills->whereIn('technology_id', $ids));
        });
        $query->when($request->filled('grade'), fn ($q) => $q->where('grade', $request->string('grade')));
        $query->when($request->filled('location'), fn ($q) => $q->where('location', 'ilike', '%'.$request->input('location').'%'));
        $query->when($request->filled('parsing_status'), fn ($q) => $q->where('parsing_status', $request->string('parsing_status')));
        $query->when($request->filled('recognition_status'), fn ($q) => $q->where('recognition_status', $request->string('recognition_status')));
        $query->when($request->filled('created_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date('created_from')));
        $query->when($request->filled('created_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date('created_to')));

        return response()->json(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function upload(UploadCandidateResumeRequest $request)
    {
        $candidate = $this->resumeUploadService->store($request->validated(), $this->currentUserId());

        $this->auditLog->log('candidate.resume_uploaded', 'candidate', $candidate->id, [
            'original_file_name' => $candidate->original_file_name,
            'file_size' => $candidate->file_size,
        ], $candidate->created_by);

        return response()->json($candidate, 202);
    }

    public function batchUpload(Request $request)
    {
        $commonValidator = Validator::make($request->all(), [
            'request_id' => ['nullable', 'uuid', 'exists:requests,id'],
            'grade' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'citizenship' => ['nullable', 'string', 'max:255'],
            'languages' => ['nullable', 'string'],
            'resumes' => ['required', 'array', 'min:1'],
        ], RussianValidation::messages(), RussianValidation::attributes());

        if ($commonValidator->fails()) {
            return response()->json(['message' => $commonValidator->errors()->first(), 'errors' => $commonValidator->errors()], 422);
        }

        $common = $commonValidator->validated();
        $created = [];
        $errors = [];
        $maxKb = ((int) env('MAX_UPLOAD_SIZE_MB', 15)) * 1024;

        foreach ((array) $request->file('resumes', []) as $index => $file) {
            if (! $file instanceof UploadedFile) {
                $errors[] = ['index' => $index, 'file_name' => null, 'message' => 'Файл резюме обязателен.'];
                continue;
            }

            $fileValidator = Validator::make(['resume' => $file], [
                'resume' => ['required', 'file', 'mimes:pdf,docx', 'max:'.$maxKb],
            ], RussianValidation::messages(), RussianValidation::attributes());

            if ($fileValidator->fails()) {
                $errors[] = [
                    'index' => $index,
                    'file_name' => $file->getClientOriginalName(),
                    'message' => $fileValidator->errors()->first(),
                ];
                continue;
            }

            $candidate = $this->resumeUploadService->store($common + ['resume' => $file], $this->currentUserId());
            $assessment = isset($common['request_id'])
                ? $this->createAssessmentFor($common['request_id'], $candidate)
                : null;

            $this->auditLog->log('candidate.resume_uploaded', 'candidate', $candidate->id, [
                'original_file_name' => $candidate->original_file_name,
                'file_size' => $candidate->file_size,
                'batch' => true,
                'request_id' => $common['request_id'] ?? null,
                'assessment_id' => $assessment?->id,
            ], $candidate->created_by);

            $created[] = [
                'candidate' => $candidate,
                'assessment' => $assessment,
            ];
        }

        $this->auditLog->log('candidate.resume_batch_uploaded', 'candidate', null, [
            'created_count' => count($created),
            'error_count' => count($errors),
            'request_id' => $common['request_id'] ?? null,
        ], $this->currentUserId());

        return response()->json(['candidates' => $created, 'errors' => $errors], 202);
    }

    public function show(Candidate $candidate)
    {
        return response()->json($candidate->load('skills.technology'));
    }

    public function update(Request $request, Candidate $candidate)
    {
        $candidate->update($request->validate([
            'display_name' => ['sometimes', 'string', 'max:255'],
            'grade' => ['sometimes', 'nullable', 'string', 'max:100'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'citizenship' => ['sometimes', 'nullable', 'string', 'max:255'],
            'languages' => ['sometimes', 'nullable', 'string'],
        ], RussianValidation::messages(), RussianValidation::attributes()));

        return response()->json($candidate->refresh());
    }

    public function skills(Candidate $candidate)
    {
        return response()->json($candidate->skills()->with('technology')->latest()->get());
    }

    public function storeSkill(StoreCandidateSkillRequest $request, Candidate $candidate)
    {
        $data = $request->validated();
        $data['normalized_name'] ??= Str::lower($data['raw_text']);
        $data['is_manual'] = true;

        $skill = $candidate->skills()->create($data);

        $this->auditLog->log('candidate_skill.created', 'candidate_skill', $skill->id, ['candidate_id' => $candidate->id], $this->currentUserId());

        return response()->json($skill->load('technology'), 201);
    }

    public function updateSkill(Request $request, CandidateSkill $skill)
    {
        $data = $request->validate([
            'technology_id' => ['sometimes', 'nullable', 'uuid', 'exists:technologies,id'],
            'raw_text' => ['sometimes', 'string', 'max:255'],
            'normalized_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'evidence_text' => ['sometimes', 'nullable', 'string'],
            'confidence' => ['sometimes', 'integer', 'between:0,100'],
        ], RussianValidation::messages(), RussianValidation::attributes());
        $data['normalized_name'] ??= isset($data['raw_text']) ? Str::lower($data['raw_text']) : $skill->normalized_name;
        $data['is_manual'] = true;

        $skill->update($data);

        $this->auditLog->log('candidate_skill.updated', 'candidate_skill', $skill->id, [], $this->currentUserId());

        return response()->json($skill->refresh()->load('technology'));
    }

    public function destroySkill(CandidateSkill $skill)
    {
        $id = $skill->id;
        $skill->delete();

        $this->auditLog->log('candidate_skill.deleted', 'candidate_skill', $id, [], $this->currentUserId());

        return response()->json(['id' => $id, 'deleted' => true]);
    }

    private function createAssessmentFor(string $requestId, Candidate $candidate): Assessment
    {
        CustomerRequest::findOrFail($requestId);

        $runNumber = ((int) Assessment::query()
            ->where('request_id', $requestId)
            ->where('candidate_id', $candidate->id)
            ->max('run_number')) + 1;

        $assessment = Assessment::create([
            'request_id' => $requestId,
            'candidate_id' => $candidate->id,
            'run_number' => $runNumber,
            'status' => $this->assessmentRuns->initialStatusFor($candidate),
        ]);

        $this->assessmentRuns->dispatchIfReady($assessment, $candidate);

        $this->auditLog->log('assessment.started', 'assessment', $assessment->id, [
            'request_id' => $assessment->request_id,
            'candidate_id' => $assessment->candidate_id,
            'run_number' => $assessment->run_number,
        ], $this->currentUserId());

        return $assessment;
    }
}
