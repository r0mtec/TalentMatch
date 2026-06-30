<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainToken = $request->bearerToken();

        if (! $plainToken) {
            return response()->json(['message' => 'Необходима авторизация.'], 401);
        }

        $token = DB::table('personal_access_tokens')
            ->where('token', hash('sha256', $plainToken))
            ->first();

        if (! $token || ($token->expires_at && now()->greaterThan($token->expires_at))) {
            return response()->json(['message' => 'Необходима авторизация.'], 401);
        }

        $user = User::find($token->tokenable_id);

        if (! $user) {
            return response()->json(['message' => 'Необходима авторизация.'], 401);
        }

        DB::table('personal_access_tokens')->where('id', $token->id)->update(['last_used_at' => now()]);

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
