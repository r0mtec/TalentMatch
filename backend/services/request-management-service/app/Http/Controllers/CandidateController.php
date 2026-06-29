<?php

namespace App\Http\Controllers;

use App\Services\ResumeUploadService;
use Illuminate\Http\Request;

class CandidateController extends Controller
{
    public function __construct(private readonly ResumeUploadService $resumeUploadService)
    {
    }

    public function index()
    {
        return response()->json([
            ['id' => 'candidate-demo-1', 'display_name' => 'Кандидат 1', 'parsing_status' => 'parsed', 'recognition_status' => 'done'],
        ]);
    }

    public function upload(Request $request)
    {
        return response()->json($this->resumeUploadService->createStubUpload($request), 202);
    }

    public function show(string $id)
    {
        return response()->json(['id' => $id, 'display_name' => 'Кандидат 1', 'skills' => []]);
    }

    public function update(Request $request, string $id)
    {
        return response()->json(['id' => $id, 'updated' => true, 'payload' => $request->all()]);
    }

    public function skills(string $candidate)
    {
        return response()->json([
            ['id' => 'skill-demo-1', 'candidate_id' => $candidate, 'normalized_name' => 'laravel', 'confidence' => 100],
        ]);
    }

    public function storeSkill(Request $request, string $candidate)
    {
        return response()->json(['id' => 'skill-created-stub', 'candidate_id' => $candidate, 'is_manual' => true, 'payload' => $request->all()], 201);
    }

    public function updateSkill(Request $request, string $skill)
    {
        return response()->json(['id' => $skill, 'updated' => true, 'payload' => $request->all()]);
    }

    public function destroySkill(string $skill)
    {
        return response()->json(['id' => $skill, 'deleted' => true]);
    }
}
