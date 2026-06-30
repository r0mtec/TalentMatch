<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\UsesRussianValidation;
use Illuminate\Foundation\Http\FormRequest;

class StoreRequirementFormRequest extends FormRequest
{
    use UsesRussianValidation;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'technology_id' => ['nullable', 'uuid', 'exists:technologies,id'],
            'raw_text' => ['required_without:technology_id', 'nullable', 'string'],
            'type' => ['required', 'in:must,nice'],
            'weight' => ['nullable', 'numeric', 'min:0.01'],
        ];
    }
}
