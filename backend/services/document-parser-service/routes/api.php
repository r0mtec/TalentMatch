<?php

use App\Http\Controllers\DocumentParserController;
use Illuminate\Support\Facades\Route;

Route::post('/internal/documents/parse', [DocumentParserController::class, 'parse']);
