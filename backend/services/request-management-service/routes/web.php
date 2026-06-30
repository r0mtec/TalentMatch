<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;

Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'request-management-service']));
Route::get('/ready', function () {
    $checks = [];

    try {
        DB::connection()->getPdo();
        $checks['postgres'] = 'ok';
    } catch (Throwable) {
        $checks['postgres'] = 'failed';
    }

    try {
        Redis::connection()->ping();
        $checks['redis'] = 'ok';
    } catch (Throwable) {
        $checks['redis'] = 'failed';
    }

    try {
        Storage::disk(config('filesystems.default', 's3'))->exists('.ready');
        $checks['minio'] = 'ok';
    } catch (Throwable) {
        $checks['minio'] = 'failed';
    }

    $ready = ! in_array('failed', $checks, true);

    return response()->json(['status' => $ready ? 'ready' : 'not_ready', 'dependencies' => $checks], $ready ? 200 : 503);
});
