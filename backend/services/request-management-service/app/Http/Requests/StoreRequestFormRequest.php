<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\UsesRussianValidation;
use Illuminate\Foundation\Http\FormRequest;

class StoreRequestFormRequest extends FormRequest
{
    use UsesRussianValidation;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'project_description' => ['nullable', 'string'],
            'grade' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'citizenship' => ['nullable', 'string', 'max:255'],
            'workload' => ['nullable', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'max:50'],
        ];
    }
}
