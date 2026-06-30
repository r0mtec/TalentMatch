<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TechnologySynonym extends Model
{
    use UsesUuid;

    protected $fillable = ['technology_id', 'synonym', 'normalized_synonym'];

    public function technology(): BelongsTo
    {
        return $this->belongsTo(Technology::class);
    }
}
