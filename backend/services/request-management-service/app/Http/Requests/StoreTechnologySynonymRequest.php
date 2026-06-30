<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class StoreTechnologySynonymRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'synonym' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (\App\Models\TechnologySynonym::where('normalized_synonym', Str::lower($value))->exists()) {
                        $fail('The synonym is already linked to a technology.');
                    }
                },
            ],
        ];
    }
}
