<?php

namespace App\Services;

class RuleBasedSkillRecognizer
{
    private array $dictionary = [
        'php' => ['PHP'],
        'laravel' => ['Laravel'],
        'postgresql' => ['PostgreSQL', 'Postgre', 'postgres', 'pgsql'],
        'react' => ['React', 'ReactJS', 'React.js'],
        'docker' => ['Docker'],
    ];

    public function recognize(string $text): array
    {
        $normalizedText = mb_strtolower($text);
        $skills = [];

        foreach ($this->dictionary as $normalizedName => $synonyms) {
            foreach ($synonyms as $synonym) {
                if (str_contains($normalizedText, mb_strtolower($synonym))) {
                    $skills[] = [
                        'technology_id' => null,
                        'normalized_name' => $normalizedName,
                        'raw_text' => $synonym,
                        'evidence_text' => $this->evidence($text, $synonym),
                        'confidence' => $synonym === $normalizedName ? 100 : 95,
                    ];
                    break;
                }
            }
        }

        return ['status' => 'done', 'skills' => $skills, 'unrecognized_terms' => []];
    }

    private function evidence(string $text, string $term): string
    {
        $position = mb_stripos($text, $term);

        if ($position === false) {
            return mb_substr($text, 0, 180);
        }

        return mb_substr($text, max(0, $position - 60), 180);
    }
}
