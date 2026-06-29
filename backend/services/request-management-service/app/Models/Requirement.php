<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class Requirement extends Model
{
    use UsesUuid;

    protected $fillable = ['request_id', 'technology_id', 'raw_text', 'type', 'weight'];
}
