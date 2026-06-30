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

            $candidate->update([
                'parsed_text' => $result['text'] ?? '',
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
