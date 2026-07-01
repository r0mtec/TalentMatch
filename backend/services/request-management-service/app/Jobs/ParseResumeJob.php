<?php

namespace App\Jobs;

use App\Models\Candidate;
use App\Services\Internal\DocumentParserClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ParseResumeJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $candidateId)
    {
    }

    public function handle(DocumentParserClient $client): void
    {
        $candidate = Candidate::findOrFail($this->candidateId);
        $candidate->update(['parsing_status' => 'processing']);

        try {
            $result = $client->parse($candidate);
            $sections = $result['sections'] ?? [];

            $candidate->update([
                'parsed_text' => $result['plain_text'] ?? '',
                'grade' => $candidate->grade ?: ($sections['grade'] ?? null),
                'location' => $candidate->location ?: ($sections['location'] ?? null),
                'languages' => $candidate->languages ?: ($sections['languages'] ?? null),
                'parsing_status' => 'parsed',
                'recognition_status' => 'pending',
            ]);

            RecognizeCandidateSkillsJob::dispatch($candidate->id);
        } catch (\Throwable $exception) {
            $candidate->update(['parsing_status' => 'failed']);

            throw $exception;
        }
    }
}
