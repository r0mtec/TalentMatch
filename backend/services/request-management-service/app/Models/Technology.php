<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class Technology extends Model
{
    use UsesUuid;

    protected $fillable = ['name', 'group_name', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];
}
