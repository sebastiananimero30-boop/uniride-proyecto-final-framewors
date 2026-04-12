<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\TripPassenger;
use App\Models\Notification;
use Illuminate\Http\Request;

class TripPassengerController extends Controller
{
    // Buscar viajes compatibles por origen y destino
    public function search(Request $request)
    {
        $request->validate([
            'origin'      => 'required|string',
            'destination' => 'required|string',
            'date'        => 'nullable|date',
        ]);

        $query = Trip::with(['driver', 'vehicle'])
            ->where('status', 'publicado')
            ->where('available_seats', '>', 0)
            ->where('departure_time', '>', now());

        // Matching por origen: busca coincidencia parcial (no exacta)
        $query->where(function ($q) use ($request) {
            $q->whereRaw('LOWER(origin) LIKE ?', ['%' . strtolower($request->origin) . '%'])
              ->orWhereRaw('LOWER(origin) LIKE ?', ['%' . strtolower(explode(' ', $request->origin)[0]) . '%']);
        });

        // Matching por destino: busca coincidencia parcial
        $query->where(function ($q) use ($request) {
            $q->whereRaw('LOWER(destination) LIKE ?', ['%' . strtolower($request->destination) . '%'])
              ->orWhereRaw('LOWER(destination) LIKE ?', ['%' . strtolower(explode(' ', $request->destination)[0]) . '%']);
        });

        // Filtrar por fecha si se proporciona
        if ($request->date) {
            $query->whereDate('departure_time', $request->date);
        }

        $trips = $query->orderBy('departure_time')->get();

        return response()->json([
            'total'  => $trips->count(),
            'trips'  => $trips,
        ]);
    }

    // Unirse a un viaje (pasajero)
    public function join(Request $request, $tripId)
    {
        $trip = Trip::findOrFail($tripId);

        // Verificar que el viaje esté disponible
        if (!$trip->isAvailable()) {
            return response()->json([
                'message' => 'Este viaje no está disponible.'
            ], 422);
        }

        // Verificar que el pasajero no sea el conductor
        if ($trip->driver_id === $request->user()->id) {
            return response()->json([
                'message' => 'No puedes unirte a tu propio viaje.'
            ], 422);
        }

        // Verificar que no esté ya unido
        $exists = TripPassenger::where('trip_id', $tripId)
            ->where('passenger_id', $request->user()->id)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Ya estás unido a este viaje.'
            ], 422);
        }

        // Unirse al viaje
        TripPassenger::create([
            'trip_id'      => $tripId,
            'passenger_id' => $request->user()->id,
            'pickup_point' => $request->pickup_point ?? null,
            'status'       => 'confirmado',
        ]);

        // Reducir cupos disponibles
        $trip->decrement('available_seats');

        // Notificar al conductor
        Notification::create([
            'user_id' => $trip->driver_id,
            'type'    => 'nuevo_pasajero',
            'message' => "{$request->user()->name} se unió a tu viaje de {$trip->origin} a {$trip->destination}.",
            'data'    => ['trip_id' => $trip->id, 'passenger_id' => $request->user()->id],
        ]);

        return response()->json([
            'message' => 'Te uniste al viaje exitosamente.',
        ], 201);
    }

    // Cancelar participación en un viaje (pasajero)
    public function leave(Request $request, $tripId)
    {
        $tripPassenger = TripPassenger::where('trip_id', $tripId)
            ->where('passenger_id', $request->user()->id)
            ->firstOrFail();

        if ($tripPassenger->status === 'cancelado') {
            return response()->json([
                'message' => 'Ya cancelaste este viaje.'
            ], 422);
        }

        $tripPassenger->update([
            'status'        => 'cancelado',
            'cancelled_at'  => now(),
            'cancel_reason' => $request->reason ?? null,
        ]);

        // Devolver el cupo
        $trip = Trip::findOrFail($tripId);
        $trip->increment('available_seats');

        // Notificar al conductor
        Notification::create([
            'user_id' => $trip->driver_id,
            'type'    => 'pasajero_canceló',
            'message' => "{$request->user()->name} canceló su participación en tu viaje de {$trip->origin} a {$trip->destination}.",
            'data'    => ['trip_id' => $trip->id, 'passenger_id' => $request->user()->id],
        ]);

        return response()->json([
            'message' => 'Cancelaste tu participación en el viaje.',
        ]);
    }

    // Ver viajes en los que participa el pasajero
    public function myTrips(Request $request)
    {
        $trips = TripPassenger::with(['trip.driver', 'trip.vehicle'])
            ->where('passenger_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($trips);
    }
}