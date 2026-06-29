<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        return response()->json([
            'token' => 'stub-token',
            'user' => ['id' => '00000000-0000-0000-0000-000000000001', 'login' => $request->input('login'), 'role' => 'account_manager'],
        ]);
    }

    public function logout()
    {
        return response()->json(['status' => 'logged_out']);
    }

    public function me()
    {
        return response()->json(['id' => '00000000-0000-0000-0000-000000000001', 'login' => 'demo', 'role' => 'account_manager']);
    }
}
