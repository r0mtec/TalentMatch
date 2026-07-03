<?php

namespace Tests\Unit;

use App\Services\RuleBasedSkillRecognizer;
use PHPUnit\Framework\TestCase;

class RuleBasedSkillRecognizerTest extends TestCase
{
    public function test_it_normalizes_and_matches_synonyms_case_insensitively(): void
    {
        $result = $this->recognizer()->recognize(
            'Skills: опыт с PGSQL, laravel и Docker.',
            [
                [
                    'id' => 'tech-postgres',
                    'name' => 'PostgreSQL',
                    'synonyms' => ['Postgres', 'pgsql'],
                ],
                [
                    'id' => 'tech-laravel',
                    'name' => 'Laravel',
                    'synonyms' => [],
                ],
            ],
        );

        self::assertSame('done', $result['status']);
        self::assertSame(['tech-postgres', 'tech-laravel'], array_column($result['skills'], 'technology_id'));
        self::assertSame('postgresql', $result['skills'][0]['normalized_name']);
        self::assertSame('pgsql', $result['skills'][0]['raw_text']);
        self::assertNotEmpty($result['skills'][0]['evidence_text']);
    }

    public function test_java_does_not_match_inside_javascript(): void
    {
        $result = $this->recognizer()->recognize(
            'Skills: JavaScript, TypeScript, React.',
            [
                [
                    'id' => 'tech-java',
                    'name' => 'Java',
                    'synonyms' => ['Java'],
                ],
                [
                    'id' => 'tech-js',
                    'name' => 'JavaScript',
                    'synonyms' => ['JS'],
                ],
            ],
        );

        self::assertSame(['tech-js'], array_column($result['skills'], 'technology_id'));
    }

    public function test_evidence_returns_sentence_containing_matched_term(): void
    {
        $result = $this->recognizer()->recognize(
            'Опыт коммерческой разработки. Использовал PHP, Laravel и PostgreSQL в backend-сервисах; Docker был в инфраструктуре.',
            [
                [
                    'id' => 'tech-postgres',
                    'name' => 'PostgreSQL',
                    'synonyms' => ['psql'],
                ],
            ],
        );

        self::assertSame(
            'Использовал PHP, Laravel и PostgreSQL в backend-сервисах;',
            $result['skills'][0]['evidence_text'],
        );
    }

    public function test_it_returns_unrecognized_terms_from_skills_section(): void
    {
        $result = $this->recognizer()->recognize("Skills:\nLaravel, Kafka, ClickHouse\nExperience:\nBackend work");

        self::assertContains('Kafka', array_column($result['unrecognized_terms'], 'term'));
        self::assertContains('ClickHouse', array_column($result['unrecognized_terms'], 'term'));
    }

    private function recognizer(): RuleBasedSkillRecognizer
    {
        return new RuleBasedSkillRecognizer();
    }
}
