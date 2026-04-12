<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Trip extends Model
{
    use HasFactory;

    protected $fillable = [
        'driver_id',
        'vehicle_id',
        'origin',
        'origin_lat',
        'origin_lng',
        'destination',
        'destination_lat',
        'destination_lng',
        'departure_time',
        'available_seats',
        'price_per_seat',
        'status',
        'notes',
    ];

    protected $casts = [
        'departure_time' => 'datetime',
        'origin_lat'     => 'float',
        'origin_lng'     => 'float',
        'destination_lat'=> 'float',
        'destination_lng'=> 'float',
    ];

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function passengers()
    {
        return $this->belongsToMany(User::class, 'trip_passengers', 'trip_id', 'passenger_id')
                    ->withPivot('status', 'pickup_point', 'cancel_reason')
                    ->withTimestamps();
    }

    public function ratings()
    {
        return $this->hasMany(Rating::class);
    }

    public function isAvailable(): bool
    {
        return $this->status === 'publicado' && $this->available_seats > 0;
    }
}