<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Auth;

trait ResolvesUser
{
    protected function currentUserId(): string
    {
        if (Auth::id()) {
            return Auth::id();
        }

        abort(response()->json(['message' => 'Необходима авторизация.'], 401));
    }
}
