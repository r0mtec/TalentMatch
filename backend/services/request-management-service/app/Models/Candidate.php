<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Candidate extends Model
{
    use SoftDeletes;
    use UsesUuid;

    protected $fillable = [
        'display_name',
        'grade',
        'location',
        'citizenship',
        'languages',
        'parsed_text',
        'file_storage_key',
        'original_file_name',
        'file_mime_type',
        'file_size',
        'file_checksum',
        'parsing_status',
        'recognition_status',
        'created_by',
    ];

    protected $casts = [];

    public function skills(): HasMany
    {
        return $this->hasMany(CandidateSkill::class);
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class);
    }
}
