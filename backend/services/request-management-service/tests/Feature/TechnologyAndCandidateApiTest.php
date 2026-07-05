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
            'name' => 'Elasticsearch',
            'group_name' => 'other',
        ])->assertCreated()
            ->json('id');

        $this->withToken($token)->postJson('/api/technologies/'.$technologyId.'/synonyms', [
            'synonym' => 'Elastic',
        ])->assertCreated()
            ->assertJsonPath('normalized_synonym', 'elastic');

        $this->withToken($token)->postJson('/api/technologies/'.$technologyId.'/synonyms', [
            'synonym' => 'elastic',
        ])->assertStatus(422);
    }

    public function test_starter_technology_dictionary_is_available_after_migrations(): void
    {
        $this->assertDatabaseHas('technologies', ['name' => 'Laravel', 'group_name' => 'frameworks']);
        $this->assertDatabaseHas('technologies', ['name' => 'PostgreSQL', 'group_name' => 'databases']);
        $this->assertDatabaseHas('technology_synonyms', ['synonym' => 'Postgres', 'normalized_synonym' => 'postgres']);
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

    public function test_candidate_upload_uses_grade_and_location_as_display_name_when_name_is_missing(): void
    {
        Queue::fake();
        Storage::fake('s3');
        config(['filesystems.default' => 's3']);
        $token = $this->adminToken();

        $this->withToken($token)->post('/api/candidates/upload', [
            'display_name' => '   ',
            'grade' => 'Middle',
            'location' => 'Kazan',
            'resume' => UploadedFile::fake()->create('resume.docx', 12, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ])->assertAccepted()
            ->assertJsonPath('display_name', 'Middle Kazan');
    }

    public function test_batch_upload_with_request_id_does_not_copy_request_conditions_to_candidate(): void
    {
        Queue::fake();
        Storage::fake('s3');
        config(['filesystems.default' => 's3']);
        $token = $this->adminToken();
        $admin = User::query()->where('login', 'admin')->firstOrFail();
        $request = CustomerRequest::create([
            'title' => 'Backend search',
            'position' => 'Backend developer',
            'grade' => 'Lead',
            'location' => 'Remote',
            'citizenship' => 'RU',
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $this->withToken($token)->post('/api/candidates/batch-upload', [
            'request_id' => $request->id,
            'grade' => $request->grade,
            'location' => $request->location,
            'citizenship' => $request->citizenship,
            'resumes' => [
                UploadedFile::fake()->create(
                    'resume.docx',
                    12,
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ),
            ],
        ])->assertAccepted()
            ->assertJsonPath('candidates.0.candidate.grade', null)
            ->assertJsonPath('candidates.0.candidate.location', null)
            ->assertJsonPath('candidates.0.candidate.citizenship', null)
            ->assertJsonPath('candidates.0.assessment.request_id', $request->id);
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
        $technology = Technology::query()->where('name', 'Laravel')->firstOrFail();
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

    public function test_assessment_for_failed_candidate_is_marked_failed_without_dispatching_job(): void
    {
        Queue::fake();

        $token = $this->adminToken();
        $admin = User::query()->where('login', 'admin')->firstOrFail();
        $request = CustomerRequest::create([
            'title' => 'Backend search',
            'position' => 'Backend developer',
            'status' => 'active',
            'created_by' => $admin->id,
        ]);
        $candidate = Candidate::create([
            'display_name' => 'Broken Resume Candidate',
            'file_storage_key' => 'resumes/broken.docx',
            'original_file_name' => 'broken.docx',
            'file_mime_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'file_size' => 100,
            'parsing_status' => 'failed',
            'recognition_status' => 'failed',
            'created_by' => $admin->id,
        ]);

        $this->withToken($token)
            ->postJson('/api/requests/'.$request->id.'/candidates/'.$candidate->id.'/assessments')
            ->assertAccepted()
            ->assertJsonPath('status', 'failed');

        Queue::assertNotPushed(CalculateAssessmentJob::class);
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
        $technology = Technology::query()->where('name', 'PostgreSQL')->firstOrFail();
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
