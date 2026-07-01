<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\UsesRussianValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTechnologyRequest extends FormRequest
{
    use UsesRussianValidation;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:technologies,name'],
            'group_name' => ['required', Rule::in(['languages', 'frameworks', 'databases', 'infrastructure', 'other'])],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
