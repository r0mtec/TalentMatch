<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\UsesRussianValidation;
use Illuminate\Foundation\Http\FormRequest;

class UploadCandidateResumeRequest extends FormRequest
{
    use UsesRussianValidation;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $maxKb = ((int) env('MAX_UPLOAD_SIZE_MB', 15)) * 1024;

        return [
            'display_name' => ['nullable', 'string', 'max:255'],
            'grade' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'citizenship' => ['nullable', 'string', 'max:255'],
            'languages' => ['nullable', 'string'],
            'resume' => ['required', 'file', 'mimes:pdf,docx', 'max:'.$maxKb],
        ];
    }
}
