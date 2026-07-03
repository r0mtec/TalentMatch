<?php

namespace Tests\Feature;

use App\Jobs\CalculateAssessmentJob;
use App\Models\Assessment;
use App\Models\Candidate;
use App\Models\CustomerRequest;
use App\Models\Technology;
use App\Models\User;
use App\Services\Internal\AssessmentClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TechnologyAndCandidateApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_technology_synonym_and_duplicate_is_rejected(): void
    {
        $token = $this->adminToken();

        $technologyId = $this->withToken($token)->postJson('/api/technologies', [
            'name' => 'PostgreSQL',
            'group_name' => 'databases',
        ])->assertCreated()
            ->json('id');

        $this->withToken($token)->postJson('/api/technologies/'.$technologyId.'/synonyms', [
            'synonym' => 'Postgres',
        ])->assertCreated()
            ->assertJsonPath('normalized_synonym', 'postgres');

        $this->withToken($token)->postJson('/api/technologies/'.$technologyId.'/synonyms', [
            'synonym' => 'postgres',
        ])->assertStatus(422);
    }

    public function test_candidate_upload_accepts_docx_metadata_and_rejects_unsupported_format(): void
    {
        Queue::fake();
        Storage::fake('s3');
        config(['filesystems.default' => 's3']);
        $token = $this->adminToken();

        $this->withToken($token)->post('/api/candidates/upload', [
            'display_name' => 'Synthetic Candidate',
            'grade' => 'Senior',
            'location' => 'Remote',
            'citizenship' => 'RU',
            'resume' => UploadedFile::fake()->create(
                'synthetic-resume.docx',
                12,
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ),
        ])->assertAccepted()
            ->assertJsonPath('display_name', 'Synthetic Candidate')
            ->assertJsonPath('original_file_name', 'synthetic-resume.docx')
            ->assertJsonPath('parsing_status', 'uploaded')
            ->assertJsonPath('recognition_status', 'pending');

        $this->withToken($token)->post('/api/candidates/upload', [
            'resume' => UploadedFile::fake()->create('resume.txt', 1, 'text/plain'),
        ])->assertStatus(422);
    }

    public function test_candidate_upload_rejects_file_above_limit(): void
    {
        Storage::fake('s3');
        config(['filesystems.default' => 's3']);
        $token = $this->adminToken();

        $this->withToken($token)->post('/api/candidates/upload', [
            'resume' => UploadedFile::fake()->create('too-large.pdf', 16 * 1024 + 1, 'application/pdf'),
        ])->assertStatus(422);
    }

    public function test_assessment_is_queued_for_pending_candidate_with_manual_skill(): void
    {
        Queue::fake();

        $token = $this->adminToken();
        $admin = User::query()->where('login', 'admin')->firstOrFail();
        $technology = Technology::create(['name' => 'Laravel', 'group_name' => 'frameworks']);
        $request = CustomerRequest::create([
            'title' => 'Backend search',
            'position' => 'Backend developer',
            'status' => 'active',
            'created_by' => $admin->id,
        ]);
        $candidate = Candidate::create([
            'display_name' => 'Manual Skill Candidate',
            'file_storage_key' => 'resumes/manual.pdf',
            'original_file_name' => 'manual.pdf',
            'file_mime_type' => 'application/pdf',
            'file_size' => 100,
            'parsing_status' => 'uploaded',
            'recognition_status' => 'pending',
            'created_by' => $admin->id,
        ]);

        $candidate->skills()->create([
            'technology_id' => $technology->id,
            'raw_text' => 'Laravel',
            'normalized_name' => 'laravel',
            'is_manual' => true,
        ]);

        $assessmentId = $this->withToken($token)
            ->postJson('/api/requests/'.$request->id.'/candidates/'.$candidate->id.'/assessments')
            ->assertAccepted()
            ->assertJsonPath('status', 'queued')
            ->json('id');

        Queue::assertPushed(CalculateAssessmentJob::class, fn (CalculateAssessmentJob $job) => $job->assessmentId === $assessmentId);
    }

    public function test_assessment_payload_resolves_requirement_synonym_to_canonical_technology_name(): void
    {
        Http::fake([
            'assessment-service:8000/*' => Http::response([
                'status' => 'done',
                'must_score' => 100,
                'nice_score' => 0,
                'total_score' => 100,
                'has_missing_must_requirements' => false,
                'requirement_results' => [],
            ]),
        ]);

        $admin = User::query()->firstOrCreate(
            ['login' => 'admin'],
            [
                'id' => '11111111-1111-4111-8111-111111111111',
                'password_hash' => Hash::make('password'),
                'role' => 'admin',
            ],
        );
        $technology = Technology::create(['name' => 'PostgreSQL', 'group_name' => 'databases']);
        $technology->synonyms()->create([
            'synonym' => 'Postgres',
            'normalized_synonym' => 'postgres',
        ]);
        $request = CustomerRequest::create([
            'title' => 'Backend search',
            'position' => 'Backend developer',
            'status' => 'active',
            'created_by' => $admin->id,
        ]);
        $request->requirements()->create([
            'raw_text' => 'Postgres',
            'type' => 'must',
            'weight' => 3,
        ]);
        $candidate = Candidate::create([
            'display_name' => 'PostgreSQL Candidate',
            'file_storage_key' => 'resumes/postgresql.pdf',
            'original_file_name' => 'postgresql.pdf',
            'file_mime_type' => 'application/pdf',
            'file_size' => 100,
            'parsing_status' => 'parsed',
            'recognition_status' => 'done',
            'created_by' => $admin->id,
        ]);
        $candidate->skills()->create([
            'technology_id' => $technology->id,
            'raw_text' => 'PostgreSQL',
            'normalized_name' => 'postgresql',
        ]);
        $assessment = Assessment::create([
            'request_id' => $request->id,
            'candidate_id' => $candidate->id,
            'status' => 'queued',
            'run_number' => 1,
        ]);

        app(AssessmentClient::class)->calculate($assessment);

        Http::assertSent(fn ($httpRequest) => $httpRequest['requirements'][0]['normalized_name'] === 'postgresql');
    }

    private function adminToken(): string
    {
        User::query()->firstOrCreate(
            ['login' => 'admin'],
            [
                'id' => '11111111-1111-4111-8111-111111111111',
                'password_hash' => Hash::make('password'),
                'role' => 'admin',
            ],
        );

        return $this->postJson('/api/auth/login', [
            'login' => 'admin',
            'password' => 'password',
        ])->json('token');
    }
}
