<?php

namespace App\Http\Controllers;

use App\Services\RuleBasedSkillRecognizer;
use Illuminate\Http\Request;

class SkillRecognitionController extends Controller
{
    public function __construct(private readonly RuleBasedSkillRecognizer $recognizer)
    {
    }

    public function recognize(Request $request)
    {
        return response()->json($this->recognizer->recognize($request->input('plain_text', '')));
    }
}
