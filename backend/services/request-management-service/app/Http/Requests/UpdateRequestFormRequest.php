<?php

namespace App\Http\Requests;

class UpdateRequestFormRequest extends StoreRequestFormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'position' => ['sometimes', 'nullable', 'string', 'max:255'],
            'project_description' => ['sometimes', 'nullable', 'string'],
            'grade' => ['sometimes', 'nullable', 'string', 'max:100'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'citizenship' => ['sometimes', 'nullable', 'string', 'max:255'],
            'workload' => ['sometimes', 'nullable', 'string', 'max:100'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'string', 'max:50'],
        ];
    }
}
