<?php

namespace App\Services;

use App\Jobs\ParseResumeJob;
use App\Models\Candidate;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ResumeUploadService
{
    public function store(array $data, string $userId): Candidate
    {
        /** @var UploadedFile $file */
        $file = $data['resume'];
        $candidateId = (string) Str::uuid();
        $originalName = $file->getClientOriginalName();
        $storageKey = 'resumes/'.date('Y/m').'/'.$candidateId.'/'.Str::uuid().'.'.$file->getClientOriginalExtension();
        $checksum = hash_file('sha256', $file->getRealPath());

        Storage::disk(config('filesystems.default', 's3'))->put($storageKey, file_get_contents($file->getRealPath()));

        $candidate = Candidate::create([
            'id' => $candidateId,
            'display_name' => $this->displayName($data, $originalName),
            'grade' => $data['grade'] ?? null,
            'location' => $data['location'] ?? null,
            'citizenship' => $data['citizenship'] ?? null,
            'languages' => $data['languages'] ?? null,
            'file_storage_key' => $storageKey,
            'original_file_name' => $originalName,
            'file_mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'file_size' => $file->getSize(),
            'file_checksum' => $checksum,
            'parsing_status' => 'uploaded',
            'recognition_status' => 'pending',
            'created_by' => $userId,
        ]);

        ParseResumeJob::dispatch($candidate->id);

        return $candidate;
    }

    private function displayName(array $data, string $originalName): string
    {
        $explicitName = $this->filledString($data['display_name'] ?? null);

        if ($explicitName !== null) {
            return $explicitName;
        }

        $parts = array_filter([
            $this->filledString($data['grade'] ?? null),
            $this->filledString($data['location'] ?? null),
        ]);

        if ($parts !== []) {
            return implode(' ', $parts);
        }

        return pathinfo($originalName, PATHINFO_FILENAME);
    }

    private function filledString(mixed $value): ?string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
