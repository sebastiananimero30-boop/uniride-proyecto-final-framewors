<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rating;
use App\Models\Trip;
use App\Models\TripPassenger;
use App\Models\User;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    public function store(Request $request, $tripId)
    {
        $trip = Trip::findOrFail($tripId);

        // Solo se puede calificar si el viaje está completado
        if ($trip->status !== 'completado') {
            return response()->json([
                'message' => 'Solo puedes calificar viajes completados.'
            ], 422);
        }

        $request->validate([
            'rated_id' => 'required|exists:users,id',
            'score'    => 'required|integer|min:1|max:5',
            'comment'  => 'nullable|string|max:500',
        ]);

        $raterId = $request->user()->id;
        $ratedId = $request->rated_id;

        // Verificar que el calificador participó en el viaje
        $isDriver    = $trip->driver_id === $raterId;
        $isPassenger = TripPassenger::where('trip_id', $tripId)
            ->where('passenger_id', $raterId)
            ->where('status', 'confirmado')
            ->exists();

        if (!$isDriver && !$isPassenger) {
            return response()->json([
                'message' => 'No participaste en este viaje.'
            ], 403);
        }

        // Verificar que el calificado también participó
        $ratedIsDriver    = $trip->driver_id === $ratedId;
        $ratedIsPassenger = TripPassenger::where('trip_id', $tripId)
            ->where('passenger_id', $ratedId)
            ->where('status', 'confirmado')
            ->exists();

        if (!$ratedIsDriver && !$ratedIsPassenger) {
            return response()->json([
                'message' => 'El usuario calificado no participó en este viaje.'
            ], 403);
        }

        // Verificar que no se califique a sí mismo
        if ($raterId === $ratedId) {
            return response()->json([
                'message' => 'No puedes calificarte a ti mismo.'
            ], 422);
        }

        // Verificar que no haya calificado ya a este usuario en este viaje
        $exists = Rating::where('trip_id', $tripId)
            ->where('rater_id', $raterId)
            ->where('rated_id', $ratedId)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Ya calificaste a este usuario en este viaje.'
            ], 422);
        }

        // Crear la calificación
        Rating::create([
            'trip_id'  => $tripId,
            'rater_id' => $raterId,
            'rated_id' => $ratedId,
            'score'    => $request->score,
            'comment'  => $request->comment,
        ]);

        // Actualizar el promedio de calificación del usuario calificado
        $rated           = User::findOrFail($ratedId);
        $avg             = Rating::where('rated_id', $ratedId)->avg('score');
        $count           = Rating::where('rated_id', $ratedId)->count();
        $rated->rating_avg   = round($avg, 2);
        $rated->rating_count = $count;
        $rated->save();

        return response()->json([
            'message' => 'Calificación registrada exitosamente.',
        ], 201);
    }

    public function userRatings($userId)
    {
        $user = User::findOrFail($userId);

        $ratings = Rating::with(['rater', 'trip'])
            ->where('rated_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'user'         => $user->only('id', 'name', 'rating_avg', 'rating_count'),
            'ratings'      => $ratings,
        ]);
    }
}