<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'brand',
        'model',
        'plate',
        'color',
        'seats',
    ];

    public function driver()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function trips()
    {
        return $this->hasMany(Trip::class);
    }
}