<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog)
    {
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('login', $credentials['login'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        $this->auditLog->log('auth.login', 'user', $user->id, [], $user->id);

        $plainToken = Str::random(80);

        DB::table('personal_access_tokens')->insert([
            'tokenable_type' => User::class,
            'tokenable_id' => $user->id,
            'name' => 'frontend',
            'token' => hash('sha256', $plainToken),
            'abilities' => json_encode($this->abilitiesForRole($user->role)),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'token_type' => 'Bearer',
            'token' => $plainToken,
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $plainToken = $request->bearerToken();

        if ($plainToken) {
            DB::table('personal_access_tokens')->where('token', hash('sha256', $plainToken))->delete();
        }

        $this->auditLog->log('auth.logout', 'user', $user?->id, [], $user?->id);

        return response()->json(['status' => 'logged_out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    private function abilitiesForRole(string $role): array
    {
        return match ($role) {
            'admin' => ['*'],
            'lead' => ['requests:read', 'candidates:read', 'assessments:read', 'reports:export'],
            default => ['requests:write', 'candidates:write', 'assessments:write', 'reports:export'],
        };
    }
}
