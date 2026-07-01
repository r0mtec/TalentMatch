<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\UsesRussianValidation;
use App\Models\TechnologySynonym;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class StoreTechnologySynonymRequest extends FormRequest
{
    use UsesRussianValidation;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('synonym')) {
            $this->merge(['synonym' => trim((string) $this->input('synonym'))]);
        }
    }

    public function rules(): array
    {
        $currentSynonym = $this->route('synonym');

        return [
            'synonym' => [
                'required',
                'string',
                'min:1',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail) use ($currentSynonym): void {
                    $query = TechnologySynonym::query()->where('normalized_synonym', Str::lower((string) $value));

                    if ($currentSynonym instanceof TechnologySynonym) {
                        $query->whereKeyNot($currentSynonym->getKey());
                    }

                    if ($query->exists()) {
                        $fail('Этот синоним уже привязан к технологии.');
                    }
                },
            ],
        ];
    }
}
