<?php

namespace Tests\Feature;

use Tests\TestCase;

class AssessmentCalculationEndpointTest extends TestCase
{
    public function test_internal_calculate_endpoint_returns_weighted_scores(): void
    {
        $response = $this->postJson('/api/internal/assessments/calculate', [
            'assessment_id' => '11111111-1111-4111-8111-111111111111',
            'requirements' => [
                [
                    'id' => '22222222-2222-4222-8222-222222222222',
                    'type' => 'must',
                    'weight' => 2,
                    'normalized_name' => 'Laravel',
                ],
                [
                    'id' => '33333333-3333-4333-8333-333333333333',
                    'type' => 'nice',
                    'weight' => 1,
                    'normalized_name' => 'Docker',
                ],
            ],
            'skills' => [
                [
                    'id' => '44444444-4444-4444-8444-444444444444',
                    'normalized_name' => 'laravel',
                    'raw_text' => 'Laravel',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'done')
            ->assertJsonPath('must_score', 100)
            ->assertJsonPath('nice_score', 0)
            ->assertJsonPath('total_score', 66.67);
    }

    public function test_internal_calculate_endpoint_returns_full_nice_score_without_nice_requirements(): void
    {
        $response = $this->postJson('/api/internal/assessments/calculate', [
            'assessment_id' => '11111111-1111-4111-8111-111111111111',
            'requirements' => [
                [
                    'id' => '22222222-2222-4222-8222-222222222222',
                    'type' => 'must',
                    'weight' => 2,
                    'normalized_name' => 'Laravel',
                ],
            ],
            'skills' => [
                [
                    'id' => '44444444-4444-4444-8444-444444444444',
                    'normalized_name' => 'laravel',
                    'raw_text' => 'Laravel',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'done')
            ->assertJsonPath('must_score', 100)
            ->assertJsonPath('nice_score', 100)
            ->assertJsonPath('total_score', 100);
    }

    public function test_internal_calculate_endpoint_validates_payload_contract(): void
    {
        $this->postJson('/api/internal/assessments/calculate', [
            'assessment_id' => 'not-a-uuid',
            'requirements' => [],
            'skills' => [],
        ])->assertStatus(422)
            ->assertJsonPath('status', 'failed');
    }
}
