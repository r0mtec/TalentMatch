<?php

namespace App\Http\Controllers;

use App\Services\RuleBasedSkillRecognizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SkillRecognitionController extends Controller
{
    public function __construct(private readonly RuleBasedSkillRecognizer $recognizer)
    {
    }

    public function recognize(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'candidate_id' => ['required', 'uuid'],
            'plain_text' => ['required', 'string'],
            'technologies' => ['nullable', 'array'],
            'technologies.*.id' => ['required_with:technologies', 'uuid'],
            'technologies.*.name' => ['required_with:technologies', 'string'],
            'technologies.*.group_name' => ['nullable', 'string'],
            'technologies.*.synonyms' => ['nullable', 'array'],
            'technologies.*.synonyms.*' => ['string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'failed',
                'skills' => [],
                'unrecognized_terms' => [],
                'error' => $validator->errors()->first(),
            ], 422);
        }

        $data = $validator->validated();

        return response()->json($this->recognizer->recognize($data['plain_text'], $data['technologies'] ?? []));
    }
}
