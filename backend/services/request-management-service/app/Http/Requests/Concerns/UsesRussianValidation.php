<?php

namespace App\Http\Requests\Concerns;

use App\Support\RussianValidation;

trait UsesRussianValidation
{
    public function messages(): array
    {
        return RussianValidation::messages();
    }

    public function attributes(): array
    {
        return RussianValidation::attributes();
    }
}
