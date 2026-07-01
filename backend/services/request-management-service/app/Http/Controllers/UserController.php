<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesUser;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    use ResolvesUser;

    public function __construct(private readonly AuditLogService $auditLog)
    {
    }

    public function index(Request $request)
    {
        $query = User::query()->orderBy('login');
        $query->when($request->filled('role'), fn ($q) => $q->where('role', $request->input('role')));
        $query->when($request->filled('q'), fn ($q) => $q->where('login', 'ilike', '%'.$request->input('q').'%'));

        return response()->json($query->paginate($request->integer('per_page', 50)));
    }

    public function show(User $user)
    {
        return response()->json($user);
    }

    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();

        $user = User::create([
            'login' => $data['login'],
            'password_hash' => Hash::make($data['password']),
            'role' => $data['role'],
        ]);

        $this->auditLog->log('user.created', 'user', $user->id, ['role' => $user->role], $this->currentUserId());

        return response()->json($user, 201);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $data = $request->validated();

        if (($data['role'] ?? null) !== null && $user->role === 'admin' && $data['role'] !== 'admin' && $this->isLastAdmin($user)) {
            return response()->json(['message' => 'Нельзя снять роль admin с последнего администратора.'], 409);
        }

        $updates = [];

        if (array_key_exists('login', $data)) {
            $updates['login'] = $data['login'];
        }

        if (array_key_exists('password', $data)) {
            $updates['password_hash'] = Hash::make($data['password']);
        }

        if (array_key_exists('role', $data)) {
            $updates['role'] = $data['role'];
        }

        $user->update($updates);

        if (array_key_exists('password_hash', $updates)) {
            DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->delete();
        }

        $this->auditLog->log('user.updated', 'user', $user->id, ['changed_fields' => array_keys($updates)], $this->currentUserId());

        return response()->json($user->refresh());
    }

    public function destroy(User $user)
    {
        if ($user->id === $this->currentUserId()) {
            return response()->json(['message' => 'Нельзя удалить текущего пользователя.'], 409);
        }

        if ($user->role === 'admin' && $this->isLastAdmin($user)) {
            return response()->json(['message' => 'Нельзя удалить последнего администратора.'], 409);
        }

        $id = $user->id;

        try {
            DB::transaction(function () use ($id, $user): void {
                DB::table('personal_access_tokens')->where('tokenable_id', $id)->delete();
                $user->delete();
            });
        } catch (QueryException) {
            return response()->json([
                'message' => 'Пользователь связан с запросами или кандидатами и не может быть удален.',
            ], 409);
        }

        $this->auditLog->log('user.deleted', 'user', $id, [], $this->currentUserId());

        return response()->json(['id' => $id, 'deleted' => true]);
    }

    private function isLastAdmin(User $user): bool
    {
        return User::where('role', 'admin')->where('id', '!=', $user->id)->doesntExist();
    }
}
