<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use UsesUuid;

    protected $fillable = ['login', 'password_hash', 'role'];

    protected $hidden = ['password_hash'];
}
