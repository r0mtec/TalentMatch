<?php

use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CandidateController;
use App\Http\Controllers\RequestController;
use App\Http\Controllers\TechnologyController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth.token')->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::apiResource('users', UserController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy'])
        ->middleware('role:admin');

    Route::apiResource('requests', RequestController::class)->only(['index', 'show']);
    Route::apiResource('requests', RequestController::class)
        ->only(['store', 'update', 'destroy'])
        ->middleware('role:account_manager,admin');
    Route::post('/requests/{request}/requirements', [RequestController::class, 'storeRequirement'])->middleware('role:account_manager,admin');
    Route::patch('/requirements/{requirement}', [RequestController::class, 'updateRequirement'])->middleware('role:account_manager,admin');
    Route::delete('/requirements/{requirement}', [RequestController::class, 'destroyRequirement'])->middleware('role:account_manager,admin');

    Route::get('/candidates', [CandidateController::class, 'index']);
    Route::get('/candidates/{candidate}', [CandidateController::class, 'show']);
    Route::get('/candidates/{candidate}/skills', [CandidateController::class, 'skills']);
    Route::post('/candidates/upload', [CandidateController::class, 'upload'])->middleware('role:account_manager,admin');
    Route::post('/candidates/batch-upload', [CandidateController::class, 'batchUpload'])->middleware('role:account_manager,admin');
    Route::patch('/candidates/{candidate}', [CandidateController::class, 'update'])->middleware('role:account_manager,admin');
    Route::post('/candidates/{candidate}/skills', [CandidateController::class, 'storeSkill'])->middleware('role:account_manager,admin');
    Route::patch('/candidate-skills/{skill}', [CandidateController::class, 'updateSkill'])->middleware('role:account_manager,admin');
    Route::delete('/candidate-skills/{skill}', [CandidateController::class, 'destroySkill'])->middleware('role:account_manager,admin');

    Route::post('/assessments', [AssessmentController::class, 'store'])->middleware('role:account_manager,admin');
    Route::get('/assessments/{assessment}', [AssessmentController::class, 'show']);
    Route::get('/requests/{request}/assessments', [AssessmentController::class, 'forRequest']);
    Route::post('/requests/{request}/candidates/{candidate}/assessments', [AssessmentController::class, 'storeForRequest'])->middleware('role:account_manager,admin');
    Route::post('/requests/{request}/compare-candidates', [AssessmentController::class, 'compareCandidates']);

    Route::get('/technologies', [TechnologyController::class, 'index']);
    Route::post('/technologies', [TechnologyController::class, 'store'])->middleware('role:admin');
    Route::patch('/technologies/{technology}', [TechnologyController::class, 'update'])->middleware('role:admin');
    Route::delete('/technologies/{technology}', [TechnologyController::class, 'destroy'])->middleware('role:admin');
    Route::post('/technologies/{technology}/synonyms', [TechnologyController::class, 'storeSynonym'])->middleware('role:admin');
    Route::patch('/technology-synonyms/{synonym}', [TechnologyController::class, 'updateSynonym'])->middleware('role:admin');
    Route::delete('/technology-synonyms/{synonym}', [TechnologyController::class, 'destroySynonym'])->middleware('role:admin');
    Route::get('/unrecognized-terms', [TechnologyController::class, 'unrecognizedTerms'])->middleware('role:admin');
    Route::post('/unrecognized-terms/{term}/promote', [TechnologyController::class, 'promoteUnrecognizedTerm'])->middleware('role:admin');

    Route::get('/assessments/{assessment}/report.pdf', [AssessmentController::class, 'report']);
    Route::get('/requests/{request}/comparison-report.pdf', [AssessmentController::class, 'comparisonReport']);
});
