<?php

namespace Tests\Feature;

use Tests\TestCase;

class DocumentParserEndpointTest extends TestCase
{
    public function test_internal_parse_endpoint_validates_supported_mime_types(): void
    {
        $this->postJson('/api/internal/documents/parse', [
            'candidate_id' => '11111111-1111-4111-8111-111111111111',
            'file_storage_key' => 'resumes/resume.txt',
            'file_mime_type' => 'text/plain',
            'original_file_name' => 'resume.txt',
        ])->assertStatus(422)
            ->assertJsonPath('status', 'failed')
            ->assertJsonPath('warnings.0', 'invalid_payload');
    }

    public function test_internal_parse_endpoint_reports_missing_storage_file(): void
    {
        config(['filesystems.default' => 'local']);

        $this->postJson('/api/internal/documents/parse', [
            'candidate_id' => '11111111-1111-4111-8111-111111111111',
            'file_storage_key' => 'resumes/missing.pdf',
            'file_mime_type' => 'application/pdf',
            'original_file_name' => 'resume.pdf',
        ])->assertStatus(404)
            ->assertJsonPath('status', 'failed')
            ->assertJsonPath('warnings.0', 'file_not_found');
    }
}
