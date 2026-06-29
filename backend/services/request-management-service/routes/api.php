<?php

use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CandidateController;
use App\Http\Controllers\RequestController;
use App\Http\Controllers\TechnologyController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout']);
Route::get('/auth/me', [AuthController::class, 'me']);

Route::apiResource('requests', RequestController::class);
Route::post('/requests/{request}/requirements', [RequestController::class, 'storeRequirement']);
Route::patch('/requirements/{requirement}', [RequestController::class, 'updateRequirement']);
Route::delete('/requirements/{requirement}', [RequestController::class, 'destroyRequirement']);

Route::get('/candidates', [CandidateController::class, 'index']);
Route::post('/candidates/upload', [CandidateController::class, 'upload']);
Route::get('/candidates/{candidate}', [CandidateController::class, 'show']);
Route::patch('/candidates/{candidate}', [CandidateController::class, 'update']);
Route::get('/candidates/{candidate}/skills', [CandidateController::class, 'skills']);
Route::post('/candidates/{candidate}/skills', [CandidateController::class, 'storeSkill']);
Route::patch('/candidate-skills/{skill}', [CandidateController::class, 'updateSkill']);
Route::delete('/candidate-skills/{skill}', [CandidateController::class, 'destroySkill']);

Route::post('/assessments', [AssessmentController::class, 'store']);
Route::get('/assessments/{assessment}', [AssessmentController::class, 'show']);
Route::get('/requests/{request}/assessments', [AssessmentController::class, 'forRequest']);
Route::post('/requests/{request}/compare-candidates', [AssessmentController::class, 'compareCandidates']);

Route::apiResource('technologies', TechnologyController::class)->except(['show']);
Route::post('/technologies/{technology}/synonyms', [TechnologyController::class, 'storeSynonym']);
Route::delete('/technology-synonyms/{synonym}', [TechnologyController::class, 'destroySynonym']);

Route::get('/assessments/{assessment}/report.pdf', [AssessmentController::class, 'report']);
Route::get('/requests/{request}/comparison-report.pdf', [AssessmentController::class, 'comparisonReport']);
