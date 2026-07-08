<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\UsesRussianValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequestFormRequest extends FormRequest
{
    use UsesRussianValidation;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $status = $this->input('status', 'draft');
        $activeStatuses = ['active'];

        return [
            'title' => [Rule::requiredIf(in_array($status, $activeStatuses, true)), 'nullable', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'position' => [Rule::requiredIf(in_array($status, $activeStatuses, true)), 'nullable', 'string', 'max:255'],
            'project_description' => ['nullable', 'string'],
            'grade' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'citizenship' => ['nullable', 'string', 'max:255'],
            'workload' => ['nullable', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['draft', 'active', 'closed', 'archived'])],
        ];
    }
}
