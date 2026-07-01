<?php

namespace App\Services\Internal;

use App\Models\Candidate;
use Illuminate\Support\Facades\Http;

class DocumentParserClient
{
    public function parse(Candidate $candidate): array
    {
        $response = Http::timeout(20)->post(rtrim(env('DOCUMENT_PARSER_URL', 'http://document-parser-service:8000'), '/').'/api/internal/documents/parse', [
            'candidate_id' => $candidate->id,
            'file_storage_key' => $candidate->file_storage_key,
            'file_mime_type' => $candidate->file_mime_type,
            'original_file_name' => $candidate->original_file_name,
        ]);

        $response->throw();

        return $response->json();
    }
}
