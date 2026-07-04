<?php

namespace Tests\Unit;

use App\Services\CoverageCalculator;
use PHPUnit\Framework\TestCase;

class CoverageCalculatorTest extends TestCase
{
    public function test_it_calculates_weighted_scores_and_missing_must_flag(): void
    {
        $result = $this->calculator()->calculate([
            'requirements' => [
                ['id' => 'must-php', 'type' => 'must', 'weight' => 3, 'normalized_name' => 'PHP'],
                ['id' => 'must-laravel', 'type' => 'must', 'weight' => 2, 'normalized_name' => 'Laravel'],
                ['id' => 'nice-docker', 'type' => 'nice', 'weight' => 1, 'normalized_name' => 'Docker'],
            ],
            'skills' => [
                ['id' => 'skill-php', 'normalized_name' => 'php', 'raw_text' => 'PHP', 'evidence_text' => 'PHP 8, Laravel'],
                ['id' => 'skill-docker', 'normalized_name' => 'docker', 'raw_text' => 'Docker'],
            ],
        ]);

        self::assertSame(60.0, $result['must_score']);
        self::assertSame(100.0, $result['nice_score']);
        self::assertSame(66.67, $result['total_score']);
        self::assertTrue($result['has_missing_must_requirements']);
        self::assertCount(3, $result['requirement_results']);
        self::assertSame('skill-php', $result['requirement_results'][0]['matched_candidate_skill_id']);
    }

    public function test_nice_score_is_complete_when_no_nice_requirements_exist(): void
    {
        $result = $this->calculator()->calculate([
            'requirements' => [
                ['id' => 'must-php', 'type' => 'must', 'weight' => 2, 'normalized_name' => 'PHP'],
            ],
            'skills' => [
                ['id' => 'skill-php', 'normalized_name' => 'php', 'raw_text' => 'PHP'],
            ],
        ]);

        self::assertSame(100.0, $result['must_score']);
        self::assertSame(100.0, $result['nice_score']);
        self::assertSame(100.0, $result['total_score']);
        self::assertFalse($result['has_missing_must_requirements']);
    }

    public function test_it_matches_by_technology_id_and_condition_statuses(): void
    {
        $result = $this->calculator()->calculate([
            'requirements' => [
                ['id' => 'req-1', 'type' => 'must', 'weight' => 1, 'technology_id' => 'tech-php'],
            ],
            'skills' => [
                ['id' => 'skill-1', 'technology_id' => 'tech-php', 'normalized_name' => 'php', 'raw_text' => 'PHP'],
            ],
            'conditions' => [
                'request_grade' => 'Senior',
                'candidate_grade' => ' senior ',
                'request_location' => 'Remote',
                'candidate_location' => 'Office',
                'request_citizenship' => 'RU',
                'candidate_citizenship' => null,
            ],
        ]);

        self::assertSame('matches', $result['grade_match_status']);
        self::assertSame('does_not_match', $result['location_match_status']);
        self::assertSame('unknown', $result['citizenship_match_status']);
    }

    private function calculator(): CoverageCalculator
    {
        return new CoverageCalculator();
    }
}
