<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AssessmentController extends Controller
{
    public function store(Request $request)
    {
        return response()->json([
            'id' => 'assessment-stub',
            'status' => 'processing',
            'request_id' => $request->input('request_id'),
            'candidate_id' => $request->input('candidate_id'),
        ], 202);
    }

    public function show(string $id)
    {
        return response()->json([
            'id' => $id,
            'status' => 'done',
            'total_score' => 86,
            'must_score' => 80,
            'nice_score' => 100,
            'has_missing_must_requirements' => true,
            'matched_requirements' => [],
            'missing_requirements' => [],
        ]);
    }

    public function forRequest(string $request)
    {
        return response()->json([['id' => 'assessment-stub', 'request_id' => $request, 'total_score' => 86]]);
    }

    public function compareCandidates(Request $request, string $requestId)
    {
        return response()->json(['request_id' => $requestId, 'candidates' => $request->input('candidate_ids', []), 'items' => []]);
    }

    public function report(string $assessment)
    {
        return response('PDF report stub for assessment '.$assessment, 200)->header('Content-Type', 'application/pdf');
    }

    public function comparisonReport(string $request)
    {
        return response('PDF comparison report stub for request '.$request, 200)->header('Content-Type', 'application/pdf');
    }
}
