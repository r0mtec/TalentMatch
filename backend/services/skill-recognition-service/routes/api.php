<?php

use App\Http\Controllers\SkillRecognitionController;
use Illuminate\Support\Facades\Route;

Route::post('/internal/skills/recognize', [SkillRecognitionController::class, 'recognize']);
