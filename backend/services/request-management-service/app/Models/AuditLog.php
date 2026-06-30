<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use UsesUuid;

    protected $fillable = ['user_id', 'action', 'entity_type', 'entity_id', 'metadata', 'correlation_id'];

    protected $casts = [
        'metadata' => 'array',
    ];
}
