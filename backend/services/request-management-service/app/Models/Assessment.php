<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class Assessment extends Model
{
    use UsesUuid;

    protected $fillable = [
        'request_id',
        'candidate_id',
        'must_score',
        'nice_score',
        'total_score',
        'has_missing_must_requirements',
        'grade_match_status',
        'location_match_status',
        'citizenship_match_status',
        'status',
        'calculated_at',
    ];

    protected $casts = [
        'has_missing_must_requirements' => 'boolean',
        'calculated_at' => 'datetime',
    ];
}
