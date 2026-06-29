<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
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
}
