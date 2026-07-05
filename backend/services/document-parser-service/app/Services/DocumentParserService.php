<?php

namespace App\Services;

use App\Exceptions\DocumentParsingException;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use Smalot\PdfParser\Parser as PdfParser;
use Throwable;
use ZipArchive;

class DocumentParserService
{
    private const PDF_MIME_TYPE = 'application/pdf';
    private const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    public function parse(array $payload): array
    {
        $temporaryPath = $this->downloadToTemporaryFile($payload['file_storage_key']);

        try {
            $plainText = $this->runWithTimeout(
                fn () => $this->extractText($temporaryPath, $payload['file_mime_type'], $payload['original_file_name']),
                (int) env('DOCUMENT_PARSE_TIMEOUT_SECONDS', 15),
            );
        } finally {
            if (is_file($temporaryPath)) {
                @unlink($temporaryPath);
            }
        }

        $plainText = $this->normalizePlainText($plainText);

        if ($plainText === '') {
            throw new DocumentParsingException('Document text is empty', ['empty_text']);
        }

        return [
            'candidate_id' => $payload['candidate_id'],
            'status' => 'parsed',
            'plain_text' => $plainText,
            'sections' => $this->extractSections($plainText),
            'warnings' => [],
        ];
    }

    private function downloadToTemporaryFile(string $storageKey): string
    {
        $disk = Storage::disk(config('filesystems.default', 's3'));

        try {
            if (! $disk->exists($storageKey)) {
                throw new DocumentParsingException('Resume file was not found in storage', ['file_not_found'], 404);
            }

            $contents = $disk->get($storageKey);
        } catch (DocumentParsingException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new DocumentParsingException('Unable to read resume file from storage', ['storage_read_failed'], 502);
        }

        if ($contents === null || $contents === '') {
            throw new DocumentParsingException('Resume file is empty', ['empty_file']);
        }

        $temporaryPath = tempnam(sys_get_temp_dir(), 'resume_parse_');

        if ($temporaryPath === false || file_put_contents($temporaryPath, $contents) === false) {
            throw new DocumentParsingException('Unable to create temporary file for parsing', ['temporary_file_failed'], 500);
        }

        return $temporaryPath;
    }

    private function extractText(string $path, string $mimeType, string $fileName): string
    {
        return match ($this->detectFormat($mimeType, $fileName)) {
            'pdf' => $this->extractPdfText($path),
            'docx' => $this->extractDocxText($path),
            default => throw new DocumentParsingException('Unsupported document format', ['unsupported_format']),
        };
    }

    private function detectFormat(string $mimeType, string $fileName): string
    {
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        if ($mimeType === self::PDF_MIME_TYPE || $extension === 'pdf') {
            return 'pdf';
        }

        if ($mimeType === self::DOCX_MIME_TYPE || $extension === 'docx') {
            return 'docx';
        }

        return 'unknown';
    }

    private function extractPdfText(string $path): string
    {
        try {
            return (new PdfParser())->parseFile($path)->getText();
        } catch (Throwable $exception) {
            $message = strtolower($exception->getMessage());
            $warning = str_contains($message, 'encrypt') ? 'encrypted_pdf' : 'invalid_pdf';
            $error = $warning === 'encrypted_pdf'
                ? 'PDF is encrypted and cannot be parsed'
                : 'PDF is damaged or cannot be parsed';

            throw new DocumentParsingException($error, [$warning]);
        }
    }

    private function extractDocxText(string $path): string
    {
        try {
            $this->normalizeDocxDefaultRunStyle($path);
            $phpWord = IOFactory::load($path);
        } catch (Throwable $exception) {
            throw new DocumentParsingException('DOCX is damaged or cannot be parsed', ['invalid_docx']);
        }

        $parts = [];

        foreach ($phpWord->getSections() as $section) {
            $parts[] = $this->extractElementText($section);
        }

        return implode("\n", array_filter($parts));
    }

    private function normalizeDocxDefaultRunStyle(string $path): void
    {
        if (! class_exists(ZipArchive::class)) {
            return;
        }

        $zip = new ZipArchive();

        if ($zip->open($path) !== true) {
            return;
        }

        try {
            $stylesXml = $zip->getFromName('word/styles.xml');

            if (! is_string($stylesXml) || $stylesXml === '') {
                return;
            }

            $normalized = preg_replace(
                [
                    '/<w:rPrDefault\b([^>]*)\/>/u',
                    '/<w:rPrDefault\b([^>]*)>\s*<\/w:rPrDefault>/u',
                ],
                '<w:rPrDefault$1><w:rPr/></w:rPrDefault>',
                $stylesXml,
            ) ?? $stylesXml;

            if ($normalized !== $stylesXml) {
                $zip->addFromString('word/styles.xml', $normalized);
            }
        } finally {
            $zip->close();
        }
    }

    private function extractElementText(object $element): string
    {
        $parts = [];

        if (method_exists($element, 'getText')) {
            $text = $element->getText();

            if (is_string($text) && trim($text) !== '') {
                $parts[] = $text;
            }
        }

        if (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $childElement) {
                if (is_object($childElement)) {
                    $parts[] = $this->extractElementText($childElement);
                }
            }
        }

        if (method_exists($element, 'getRows')) {
            foreach ($element->getRows() as $row) {
                if (! method_exists($row, 'getCells')) {
                    continue;
                }

                foreach ($row->getCells() as $cell) {
                    $parts[] = $this->extractElementText($cell);
                }
            }
        }

        return implode("\n", array_filter($parts));
    }

    private function normalizePlainText(string $plainText): string
    {
        $plainText = str_replace(["\r\n", "\r"], "\n", $plainText);
        $plainText = preg_replace('/[ \t]+/u', ' ', $plainText) ?? $plainText;
        $plainText = preg_replace("/\n{3,}/u", "\n\n", $plainText) ?? $plainText;

        return trim($plainText);
    }

    private function extractSections(string $plainText): array
    {
        $sections = [
            'skills' => null,
            'technologies' => null,
            'projects' => null,
            'experience' => null,
            'grade' => null,
            'location' => null,
            'citizenship' => null,
            'languages' => null,
        ];
        $headingMap = [
            'skills' => ['навыки', 'skills'],
            'technologies' => ['technology stack', 'технологии', 'стек'],
            'projects' => ['projects', 'проекты'],
            'experience' => ['experience', 'опыт', 'work experience'],
            'languages' => ['languages', 'языки'],
        ];
        $lines = preg_split('/\n/u', $plainText) ?: [];
        $current = null;

        foreach ($lines as $line) {
            $trimmed = trim($line);
            $normalized = mb_strtolower(trim($trimmed, " \t:"));
            $matchedHeading = null;

            foreach ($headingMap as $section => $headings) {
                if (in_array($normalized, $headings, true)) {
                    $matchedHeading = $section;
                    break;
                }
            }

            if ($matchedHeading !== null) {
                $current = $matchedHeading;
                continue;
            }

            if ($current !== null && $trimmed !== '') {
                $sections[$current] = trim(($sections[$current] ? $sections[$current]."\n" : '').$trimmed);
            }
        }

        $sections['grade'] = $this->firstPattern($plainText, [
            '/(?:grade|level|грейд|уровень)\s*:?\s*(junior|middle|mid|senior|lead|principal|джуниор|мидл|сеньор|лид)\b/iu',
            '/\b(junior|middle|mid|senior|lead|principal)\b/iu',
            '/\b(джуниор|мидл|сеньор|лид)\b/iu',
        ]);
        $sections['location'] = $this->firstPattern($plainText, [
            '/(?:location|локация|город|местоположение|проживание|адрес)\s*:?\s*([^\n,;]+)/iu',
            '/(?:based in|living in)\s+([^\n,;]+)/iu',
        ]);
        $sections['citizenship'] = $this->firstPattern($plainText, [
            '/(?:citizenship|nationality|гражданство)\s*:?\s*([^\n,;]+)/iu',
            '/(?:citizen of)\s+([^\n,;]+)/iu',
            '/(?:гражданин|гражданка)\s+([^\n,;]+)/iu',
        ]);

        return $sections;
    }

    private function firstPattern(string $text, array $patterns): ?string
    {
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $match) === 1) {
                return trim($match[1]);
            }
        }

        return null;
    }

    private function runWithTimeout(callable $callback, int $timeoutSeconds): string
    {
        $timeoutSeconds = max(1, $timeoutSeconds);

        if (! function_exists('pcntl_alarm') || ! function_exists('pcntl_signal')) {
            @set_time_limit($timeoutSeconds + 5);

            return $callback();
        }

        pcntl_async_signals(true);
        pcntl_signal(SIGALRM, function () {
            throw new DocumentParsingException('Document parser timed out', ['parse_timeout'], 504);
        });

        pcntl_alarm($timeoutSeconds);

        try {
            return $callback();
        } finally {
            pcntl_alarm(0);
        }
    }
}
