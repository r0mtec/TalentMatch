<?php

namespace Tests\Feature;

use Tests\TestCase;

class ReportEndpointTest extends TestCase
{
    public function test_assessment_report_endpoint_validates_contract(): void
    {
        $this->postJson('/api/internal/reports/assessment', [
            'assessment' => [
                'id' => '11111111-1111-4111-8111-111111111111',
                'request' => ['title' => 'Backend'],
                'candidate' => ['display_name' => 'Synthetic Candidate'],
                'requirement_results' => [
                    [
                        'requirement_text' => 'Laravel',
                        'requirement_type' => 'must',
                        'requirement_weight' => 3,
                        'is_matched' => true,
                        'score_contribution' => 3,
                        'matched_skill' => 'Laravel',
                    ],
                ],
            ],
        ])->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_comparison_report_endpoint_validates_contract(): void
    {
        $this->postJson('/api/internal/reports/comparison', [
            'request' => [
                'id' => '22222222-2222-4222-8222-222222222222',
                'title' => 'Backend',
            ],
            'assessments' => [
                [
                    'candidate' => ['display_name' => 'Synthetic Candidate'],
                    'status' => 'done',
                    'total_score' => 100,
                    'must_score' => 100,
                    'nice_score' => 0,
                ],
            ],
        ])->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_report_endpoints_reject_invalid_payloads(): void
    {
        $this->postJson('/api/internal/reports/assessment', [
            'assessment' => ['id' => 'not-a-uuid'],
        ])->assertStatus(422)
            ->assertJsonPath('status', 'failed');
    }
}
