<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'document-parser-service']));
Route::get('/ready', fn () => response()->json(['status' => 'ready', 'dependencies' => ['minio']]));
