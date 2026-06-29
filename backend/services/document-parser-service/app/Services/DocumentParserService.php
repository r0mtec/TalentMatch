<?php

namespace App\Services;

class DocumentParserService
{
    public function parseStub(array $payload): array
    {
        return [
            'candidate_id' => $payload['candidate_id'] ?? 'candidate-stub',
            'status' => 'parsed',
            'plain_text' => 'PHP, Laravel, PostgreSQL, Docker, ReactJS. Опыт коммерческой разработки 5 лет.',
            'warnings' => [],
        ];
    }
}
