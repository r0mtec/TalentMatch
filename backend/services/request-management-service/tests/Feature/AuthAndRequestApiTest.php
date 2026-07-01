<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthAndRequestApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_and_access_protected_endpoint(): void
    {
        $this->createAdmin();

        $login = $this->postJson('/api/auth/login', [
            'login' => 'admin',
            'password' => 'password',
        ]);

        $login->assertOk()
            ->assertJsonStructure(['token_type', 'token', 'user']);

        $this->withHeader('Authorization', 'Bearer '.$login->json('token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('login', 'admin');
    }

    public function test_login_with_invalid_password_returns_unauthorized(): void
    {
        $this->createAdmin();

        $this->postJson('/api/auth/login', [
            'login' => 'admin',
            'password' => 'wrong',
        ])->assertUnauthorized();
    }

    public function test_protected_endpoint_without_token_returns_unauthorized(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_draft_request_can_be_created_without_title(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)->postJson('/api/requests', [
            'status' => 'draft',
            'position' => 'Backend developer',
        ])->assertCreated()
            ->assertJsonPath('title', null)
            ->assertJsonPath('status', 'draft');
    }

    public function test_active_request_requires_required_fields_and_requirements(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)->postJson('/api/requests', [
            'status' => 'active',
        ])->assertStatus(422);

        $draftId = $this->withToken($token)->postJson('/api/requests', [
            'status' => 'draft',
        ])->json('id');

        $this->withToken($token)->patchJson('/api/requests/'.$draftId, [
            'status' => 'active',
            'title' => 'Backend search',
            'position' => 'Backend developer',
        ])->assertStatus(422)
            ->assertJsonPath('errors.requirements.0', 'Для активного запроса нужно добавить хотя бы одно требование.');
    }

    public function test_request_status_is_limited_to_domain_values(): void
    {
        $this->withToken($this->adminToken())->postJson('/api/requests', [
            'status' => 'paused',
        ])->assertStatus(422);
    }

    private function adminToken(): string
    {
        $this->createAdmin();

        return $this->postJson('/api/auth/login', [
            'login' => 'admin',
            'password' => 'password',
        ])->json('token');
    }

    private function createAdmin(): void
    {
        User::query()->firstOrCreate(
            ['login' => 'admin'],
            [
                'id' => '11111111-1111-4111-8111-111111111111',
                'password_hash' => Hash::make('password'),
                'role' => 'admin',
            ],
        );
    }
}
