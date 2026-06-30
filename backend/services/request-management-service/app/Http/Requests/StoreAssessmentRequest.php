<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'request_id' => ['required', 'uuid', 'exists:requests,id'],
            'candidate_id' => ['required', 'uuid', 'exists:candidates,id'],
        ];
    }
}
