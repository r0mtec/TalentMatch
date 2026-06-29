<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ResumeUploadService
{
    public function createStubUpload(Request $request): array
    {
        $candidateId = (string) Str::uuid();
        $fileName = $request->file('resume')?->getClientOriginalName() ?? 'resume.pdf';

        return [
            'id' => $candidateId,
            'display_name' => $request->input('display_name', 'Новый кандидат'),
            'original_file_name' => $fileName,
            'file_storage_key' => 'resumes/'.date('Y/m').'/'.$candidateId.'/'.$fileName,
            'parsing_status' => 'uploaded',
            'recognition_status' => 'pending',
            'next_step' => 'dispatch ParseResumeJob via Redis queue',
        ];
    }
}
