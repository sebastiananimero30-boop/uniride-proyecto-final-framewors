<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\Notification;
use Illuminate\Http\Request;

class TripController extends Controller
{
    // Listar viajes disponibles (público)
    public function index(Request $request)
    {
        $trips = Trip::with(['driver', 'vehicle'])
            ->where('status', 'publicado')
            ->where('available_seats', '>', 0)
            ->where('departure_time', '>', now())
            ->orderBy('departure_time')
            ->get();

        return response()->json($trips);
    }

    // Ver un viaje específico
    public function show($id)
    {
        $trip = Trip::with(['driver', 'vehicle', 'passengers'])->findOrFail($id);
        return response()->json($trip);
    }

    // Crear viaje (solo conductores)
    public function store(Request $request)
    {
        $request->validate([
            'vehicle_id'      => 'required|exists:vehicles,id',
            'origin'          => 'required|string',
            'origin_lat'      => 'nullable|numeric',
            'origin_lng'      => 'nullable|numeric',
            'destination'     => 'required|string',
            'destination_lat' => 'nullable|numeric',
            'destination_lng' => 'nullable|numeric',
            'departure_time'  => 'required|date|after:now',
            'available_seats' => 'required|integer|min:1|max:8',
            'price_per_seat'  => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string',
        ]);

        // Verificar que el vehículo pertenece al conductor
        $vehicle = $request->user()->vehicle;
        if (!$vehicle || $vehicle->id != $request->vehicle_id) {
            return response()->json([
                'message' => 'El vehículo no te pertenece.'
            ], 403);
        }

        $trip = Trip::create([
            'driver_id'       => $request->user()->id,
            'vehicle_id'      => $request->vehicle_id,
            'origin'          => $request->origin,
            'origin_lat'      => $request->origin_lat,
            'origin_lng'      => $request->origin_lng,
            'destination'     => $request->destination,
            'destination_lat' => $request->destination_lat,
            'destination_lng' => $request->destination_lng,
            'departure_time'  => $request->departure_time,
            'available_seats' => $request->available_seats,
            'price_per_seat'  => $request->price_per_seat ?? 0,
            'notes'           => $request->notes,
            'status'          => 'publicado',
        ]);

        return response()->json([
            'message' => 'Viaje creado exitosamente.',
            'trip'    => $trip->load('vehicle'),
        ], 201);
    }

    // Actualizar estado del viaje (solo el conductor dueño)
    public function updateStatus(Request $request, $id)
    {
        $trip = Trip::findOrFail($id);

        if ($trip->driver_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $request->validate([
            'status' => 'required|in:confirmado,en_curso,completado,cancelado',
        ]);

        $validTransitions = [
            'publicado'  => ['confirmado', 'cancelado'],
            'confirmado' => ['en_curso', 'cancelado'],
            'en_curso'   => ['completado', 'cancelado'],
        ];

        $currentStatus = $trip->status;

        if (!isset($validTransitions[$currentStatus]) ||
            !in_array($request->status, $validTransitions[$currentStatus])) {
            return response()->json([
                'message' => "No puedes cambiar el estado de '$currentStatus' a '$request->status'."
            ], 422);
        }

        $trip->update(['status' => $request->status]);

        // Notificar a los pasajeros si el viaje se cancela
        if ($request->status === 'cancelado') {
            foreach ($trip->passengers as $passenger) {
                Notification::create([
                    'user_id' => $passenger->id,
                    'type'    => 'viaje_cancelado',
                    'message' => "El viaje de {$trip->origin} a {$trip->destination} fue cancelado por el conductor.",
                    'data'    => ['trip_id' => $trip->id],
                ]);
            }
        }

        return response()->json([
            'message' => 'Estado actualizado.',
            'trip'    => $trip,
        ]);
    }

    // Viajes del conductor autenticado
    public function myTrips(Request $request)
    {
        $trips = Trip::with(['vehicle', 'passengers'])
            ->where('driver_id', $request->user()->id)
            ->orderBy('departure_time', 'desc')
            ->get();

        return response()->json($trips);
    }
}