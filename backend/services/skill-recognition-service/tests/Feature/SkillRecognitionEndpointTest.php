<?php

namespace Tests\Feature;

use Tests\TestCase;

class SkillRecognitionEndpointTest extends TestCase
{
    public function test_internal_recognition_endpoint_returns_skills_and_evidence(): void
    {
        $response = $this->postJson('/api/internal/skills/recognize', [
            'candidate_id' => '11111111-1111-4111-8111-111111111111',
            'plain_text' => 'Skills: React JS, PostgreSQL, Docker.',
            'technologies' => [
                [
                    'id' => '22222222-2222-4222-8222-222222222222',
                    'name' => 'React',
                    'synonyms' => ['React JS'],
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'done')
            ->assertJsonPath('skills.0.technology_id', '22222222-2222-4222-8222-222222222222')
            ->assertJsonPath('skills.0.raw_text', 'React JS')
            ->assertJsonStructure(['skills' => [['evidence_text']]]);
    }

    public function test_internal_recognition_endpoint_validates_payload_contract(): void
    {
        $this->postJson('/api/internal/skills/recognize', [
            'candidate_id' => 'not-a-uuid',
            'plain_text' => '',
        ])->assertStatus(422)
            ->assertJsonPath('status', 'failed');
    }
}
