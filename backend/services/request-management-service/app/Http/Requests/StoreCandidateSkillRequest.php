<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCandidateSkillRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'technology_id' => ['nullable', 'uuid', 'exists:technologies,id'],
            'raw_text' => ['required', 'string', 'max:255'],
            'normalized_name' => ['nullable', 'string', 'max:255'],
            'evidence_text' => ['nullable', 'string'],
            'confidence' => ['nullable', 'integer', 'between:0,100'],
        ];
    }
}
