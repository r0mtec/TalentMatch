<?php

namespace App\Http\Controllers;

use App\Services\CoverageCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AssessmentCalculationController extends Controller
{
    public function __construct(private readonly CoverageCalculator $calculator)
    {
    }

    public function calculate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assessment_id' => ['required', 'uuid'],
            'requirements' => ['required', 'array'],
            'requirements.*.id' => ['required', 'uuid'],
            'requirements.*.type' => ['required', Rule::in(['must', 'nice'])],
            'requirements.*.weight' => ['required', 'numeric', 'min:0'],
            'requirements.*.technology_id' => ['nullable', 'uuid'],
            'requirements.*.raw_text' => ['nullable', 'string'],
            'requirements.*.normalized_name' => ['nullable', 'string'],
            'skills' => ['required', 'array'],
            'skills.*.id' => ['required', 'uuid'],
            'skills.*.technology_id' => ['nullable', 'uuid'],
            'skills.*.normalized_name' => ['nullable', 'string'],
            'skills.*.raw_text' => ['nullable', 'string'],
            'skills.*.evidence_text' => ['nullable', 'string'],
            'conditions' => ['nullable', 'array'],
            'conditions.request_grade' => ['nullable', 'string'],
            'conditions.candidate_grade' => ['nullable', 'string'],
            'conditions.request_location' => ['nullable', 'string'],
            'conditions.candidate_location' => ['nullable', 'string'],
            'conditions.request_citizenship' => ['nullable', 'string'],
            'conditions.candidate_citizenship' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'failed',
                'error' => $validator->errors()->first(),
            ], 422);
        }

        return response()->json($this->calculator->calculate($validator->validated()));
    }
}
