<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    protected $casts = [
        'is_matched' => 'boolean',
        'score_contribution' => 'decimal:2',
    ];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    public function requirement(): BelongsTo
    {
        return $this->belongsTo(Requirement::class);
    }

    public function matchedSkill(): BelongsTo
    {
        return $this->belongsTo(CandidateSkill::class, 'matched_candidate_skill_id');
    }
}
