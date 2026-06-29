<?php

use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::post('/internal/reports/assessment', [ReportController::class, 'assessment']);
Route::post('/internal/reports/comparison', [ReportController::class, 'comparison']);
