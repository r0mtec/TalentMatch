<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assessment extends Model
{
    use UsesUuid;

    protected $fillable = [
        'request_id',
        'candidate_id',
        'run_number',
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
        'must_score' => 'decimal:2',
        'nice_score' => 'decimal:2',
        'total_score' => 'decimal:2',
        'has_missing_must_requirements' => 'boolean',
        'calculated_at' => 'datetime',
    ];

    public function customerRequest(): BelongsTo
    {
        return $this->belongsTo(CustomerRequest::class, 'request_id');
    }

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }

    public function requirementResults(): HasMany
    {
        return $this->hasMany(AssessmentRequirementResult::class);
    }
}
