<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class CustomerRequest extends Model
{
    use UsesUuid;

    protected $table = 'requests';

    protected $fillable = [
        'title',
        'position',
        'project_description',
        'grade',
        'location',
        'citizenship',
        'workload',
        'start_date',
        'status',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(Requirement::class, 'request_id');
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class, 'request_id');
    }
}
