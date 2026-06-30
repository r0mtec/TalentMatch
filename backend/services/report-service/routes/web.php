<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'report-service']));
Route::get('/ready', fn () => response()->json(['status' => 'ready', 'dependencies' => ['postgres']]));
