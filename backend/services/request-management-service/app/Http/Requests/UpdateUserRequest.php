<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\UsesRussianValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    use UsesRussianValidation;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'login' => ['sometimes', 'string', 'max:255', Rule::unique('users', 'login')->ignore($userId)],
            'password' => ['sometimes', 'string', 'min:8', 'max:255'],
            'role' => ['sometimes', 'string', Rule::in(['account_manager', 'lead', 'admin'])],
        ];
    }
}
