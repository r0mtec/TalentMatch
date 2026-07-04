<?php

namespace Tests\Unit;

use App\Exceptions\DocumentParsingException;
use App\Services\DocumentParserService;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

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

    public function test_it_extracts_docx_with_empty_default_run_style(): void
    {
        if (! class_exists(ZipArchive::class)) {
            $this->markTestSkipped('ZipArchive is required to build the DOCX fixture.');
        }

        Storage::fake('local');
        config(['filesystems.default' => 'local']);
        Storage::disk('local')->put('resume.docx', $this->minimalDocxWithEmptyDefaultRunStyle());

        $result = $this->parser()->parse([
            'candidate_id' => '11111111-1111-4111-8111-111111111111',
            'file_storage_key' => 'resume.docx',
            'file_mime_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'original_file_name' => 'resume.docx',
        ]);

        $this->assertSame('parsed', $result['status']);
        $this->assertStringContainsString('Laravel', $result['plain_text']);
        $this->assertStringContainsString('PostgreSQL', $result['plain_text']);
    }

    private function parser(): DocumentParserService
    {
        return new DocumentParserService();
    }

    private function minimalDocxWithEmptyDefaultRunStyle(): string
    {
        $path = tempnam(sys_get_temp_dir(), 'empty_rpr_docx_');
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
XML);
        $zip->addFromString('_rels/.rels', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
XML);
        $zip->addFromString('word/_rels/document.xml.rels', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
XML);
        $zip->addFromString('word/styles.xml', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault/>
  </w:docDefaults>
</w:styles>
XML);
        $zip->addFromString('word/document.xml', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Laravel PostgreSQL Docker</w:t></w:r></w:p>
  </w:body>
</w:document>
XML);
        $zip->close();

        $contents = file_get_contents($path);
        @unlink($path);

        return $contents;
    }
}
