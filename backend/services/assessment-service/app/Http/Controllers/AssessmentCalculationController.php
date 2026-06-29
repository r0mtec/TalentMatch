<?php

namespace App\Http\Controllers;

use App\Services\CoverageCalculator;
use Illuminate\Http\Request;

class AssessmentCalculationController extends Controller
{
    public function __construct(private readonly CoverageCalculator $calculator)
    {
    }

    public function calculate(Request $request)
    {
        return response()->json($this->calculator->calculate($request->all()));
    }
}
