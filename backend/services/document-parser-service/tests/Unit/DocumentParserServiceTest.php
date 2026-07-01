<?php

namespace Tests\Unit;

use App\Exceptions\DocumentParsingException;
use App\Services\DocumentParserService;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentParserServiceTest extends TestCase
{
    public function test_it_rejects_missing_storage_file(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $this->expectException(DocumentParsingException::class);
        $this->expectExceptionMessage('Resume file was not found in storage');

        $this->parser()->parse([
            'candidate_id' => '11111111-1111-4111-8111-111111111111',
            'file_storage_key' => 'missing.pdf',
            'file_mime_type' => 'application/pdf',
            'original_file_name' => 'resume.pdf',
        ]);
    }

    public function test_it_rejects_empty_document(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);
        Storage::disk('local')->put('empty.pdf', '');

        $this->expectException(DocumentParsingException::class);
        $this->expectExceptionMessage('Resume file is empty');

        $this->parser()->parse([
            'candidate_id' => '11111111-1111-4111-8111-111111111111',
            'file_storage_key' => 'empty.pdf',
            'file_mime_type' => 'application/pdf',
            'original_file_name' => 'resume.pdf',
        ]);
    }

    public function test_it_rejects_unsupported_format_when_called_directly(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);
        Storage::disk('local')->put('resume.txt', 'Plain text resume');

        $this->expectException(DocumentParsingException::class);
        $this->expectExceptionMessage('Unsupported document format');

        $this->parser()->parse([
            'candidate_id' => '11111111-1111-4111-8111-111111111111',
            'file_storage_key' => 'resume.txt',
            'file_mime_type' => 'text/plain',
            'original_file_name' => 'resume.txt',
        ]);
    }

    private function parser(): DocumentParserService
    {
        return new DocumentParserService();
    }
}
