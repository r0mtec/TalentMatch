<?php

use App\Http\Controllers\AssessmentCalculationController;
use Illuminate\Support\Facades\Route;

Route::post('/internal/assessments/calculate', [AssessmentCalculationController::class, 'calculate']);
