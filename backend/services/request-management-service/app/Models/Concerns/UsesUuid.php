<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

trait UsesUuid
{
    public function initializeUsesUuid(): void
    {
        $this->incrementing = false;
        $this->keyType = 'string';
    }

    protected static function bootUsesUuid(): void
    {
        static::creating(function ($model): void {
            if (! $model->getKey()) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }
}
