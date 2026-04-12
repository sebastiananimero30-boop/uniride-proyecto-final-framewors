<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'university',
        'rating_avg',
        'rating_count',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function vehicle()
    {
        return $this->hasOne(Vehicle::class);
    }

    public function tripsAsDriver()
    {
        return $this->hasMany(Trip::class, 'driver_id');
    }

    public function tripsAsPassenger()
    {
        return $this->belongsToMany(Trip::class, 'trip_passengers', 'passenger_id', 'trip_id')
                    ->withPivot('status', 'pickup_point', 'cancel_reason')
                    ->withTimestamps();
    }

    public function ratingsReceived()
    {
        return $this->hasMany(Rating::class, 'rated_id');
    }

    public function ratingsGiven()
    {
        return $this->hasMany(Rating::class, 'rater_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function isDriver(): bool
    {
        return $this->role === 'conductor';
    }

    public function isPassenger(): bool
    {
        return $this->role === 'pasajero';
    }
}