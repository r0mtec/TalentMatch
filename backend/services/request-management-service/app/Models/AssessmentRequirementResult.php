<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class AssessmentRequirementResult extends Model
{
    use UsesUuid;

    protected $fillable = [
        'assessment_id',
        'requirement_id',
        'matched_candidate_skill_id',
        'is_matched',
        'evidence_text',
        'score_contribution',
        'comment',
    ];

    protected $casts = ['is_matched' => 'boolean'];
}
