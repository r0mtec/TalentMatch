<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

$statelessMiddleware = [
    Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
    Illuminate\Cookie\Middleware\EncryptCookies::class,
    Illuminate\Session\Middleware\StartSession::class,
    Illuminate\View\Middleware\ShareErrorsFromSession::class,
    Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
];

Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'request-management-service']))
    ->withoutMiddleware($statelessMiddleware);

Route::get('/ready', function () {
    $checks = [];

    try {
        DB::connection()->getPdo();
        $checks['postgres'] = 'ok';
    } catch (Throwable $e) {
        Log::warning('Readiness check failed for postgres.', ['exception' => $e::class, 'message' => $e->getMessage()]);
        $checks['postgres'] = 'failed';
    }

    try {
        Redis::connection()->ping();
        $checks['redis'] = 'ok';
    } catch (Throwable $e) {
        Log::warning('Readiness check failed for redis.', ['exception' => $e::class, 'message' => $e->getMessage()]);
        $checks['redis'] = 'failed';
    }

    try {
        Storage::disk(config('filesystems.default', 's3'))->exists('.ready');
        $checks['minio'] = 'ok';
    } catch (Throwable $e) {
        Log::warning('Readiness check failed for minio.', ['exception' => $e::class, 'message' => $e->getMessage()]);
        $checks['minio'] = 'failed';
    }

    $ready = ! in_array('failed', $checks, true);

    return response()->json(['status' => $ready ? 'ready' : 'not_ready', 'dependencies' => $checks], $ready ? 200 : 503);
})->withoutMiddleware($statelessMiddleware);
