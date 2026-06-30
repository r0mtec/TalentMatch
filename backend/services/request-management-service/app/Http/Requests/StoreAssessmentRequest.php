<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\UsesRussianValidation;
use Illuminate\Foundation\Http\FormRequest;

class StoreAssessmentRequest extends FormRequest
{
    use UsesRussianValidation;

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
