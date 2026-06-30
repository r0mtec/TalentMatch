<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Requirement extends Model
{
    use UsesUuid;

    protected $fillable = ['request_id', 'technology_id', 'raw_text', 'type', 'weight'];

    protected $casts = [
        'weight' => 'decimal:2',
    ];

    public function customerRequest(): BelongsTo
    {
        return $this->belongsTo(CustomerRequest::class, 'request_id');
    }

    public function technology(): BelongsTo
    {
        return $this->belongsTo(Technology::class);
    }
}
