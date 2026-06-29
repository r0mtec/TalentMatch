<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class CandidateSkill extends Model
{
    use UsesUuid;

    protected $fillable = [
        'candidate_id',
        'technology_id',
        'normalized_name',
        'raw_text',
        'evidence_text',
        'confidence',
        'is_manual',
    ];

    protected $casts = ['is_manual' => 'boolean'];
}
