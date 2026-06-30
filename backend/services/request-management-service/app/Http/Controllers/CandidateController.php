<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesUser;
use App\Http\Requests\StoreCandidateSkillRequest;
use App\Http\Requests\UploadCandidateResumeRequest;
use App\Models\Candidate;
use App\Models\CandidateSkill;
use App\Services\AuditLogService;
use App\Services\ResumeUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CandidateController extends Controller
{
    use ResolvesUser;

    public function __construct(
        private readonly ResumeUploadService $resumeUploadService,
        private readonly AuditLogService $auditLog,
    )
    {
    }

    public function index(Request $request)
    {
        return response()->json(
            Candidate::query()
                ->latest()
                ->paginate($request->integer('per_page', 25))
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
        ]));

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
        ]);
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
}
