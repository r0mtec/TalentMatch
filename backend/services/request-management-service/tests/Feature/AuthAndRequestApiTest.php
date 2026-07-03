<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Candidate;
use App\Models\CustomerRequest;
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

    public function test_duplicate_requirement_post_is_idempotent(): void
    {
        $token = $this->adminToken();
        $admin = User::query()->where('login', 'admin')->firstOrFail();
        $request = CustomerRequest::create([
            'title' => 'Backend search',
            'position' => 'Backend developer',
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);

        $payload = [
            'raw_text' => ' PHP ',
            'type' => 'must',
            'weight' => 3,
        ];

        $requirementId = $this->withToken($token)
            ->postJson('/api/requests/'.$request->id.'/requirements', $payload)
            ->assertCreated()
            ->json('id');

        $this->withToken($token)
            ->postJson('/api/requests/'.$request->id.'/requirements', [
                'raw_text' => 'php',
                'type' => 'must',
                'weight' => 5,
            ])
            ->assertOk()
            ->assertJsonPath('id', $requirementId);

        $this->assertSame(1, $request->requirements()->count());
    }

    public function test_requirement_update_cannot_create_duplicate(): void
    {
        $token = $this->adminToken();
        $admin = User::query()->where('login', 'admin')->firstOrFail();
        $request = CustomerRequest::create([
            'title' => 'Backend search',
            'position' => 'Backend developer',
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);
        $request->requirements()->create([
            'raw_text' => 'php',
            'type' => 'must',
            'weight' => 3,
        ]);
        $dockerRequirement = $request->requirements()->create([
            'raw_text' => 'docker',
            'type' => 'must',
            'weight' => 3,
        ]);

        $this->withToken($token)
            ->patchJson('/api/requirements/'.$dockerRequirement->id, [
                'raw_text' => ' PHP ',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Такое требование уже добавлено в запрос.');
    }

    public function test_assessment_report_is_not_available_before_calculation_finishes(): void
    {
        $token = $this->adminToken();
        $admin = User::query()->where('login', 'admin')->firstOrFail();
        $request = CustomerRequest::create([
            'title' => 'Backend search',
            'position' => 'Backend developer',
            'status' => 'active',
            'created_by' => $admin->id,
        ]);
        $candidate = Candidate::create([
            'display_name' => 'Processing Candidate',
            'file_storage_key' => 'resumes/processing.pdf',
            'original_file_name' => 'processing.pdf',
            'file_mime_type' => 'application/pdf',
            'file_size' => 100,
            'parsing_status' => 'parsed',
            'recognition_status' => 'processing',
            'created_by' => $admin->id,
        ]);
        $assessment = Assessment::create([
            'request_id' => $request->id,
            'candidate_id' => $candidate->id,
            'run_number' => 1,
            'status' => 'processing',
        ]);

        $this->withToken($token)
            ->getJson('/api/assessments/'.$assessment->id.'/report.pdf')
            ->assertStatus(409)
            ->assertJsonPath('message', 'Отчет доступен только после завершения оценки.');
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
