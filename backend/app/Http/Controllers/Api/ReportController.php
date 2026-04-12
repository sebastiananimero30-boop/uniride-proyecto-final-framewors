<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\TripPassenger;
use App\Models\Rating;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();

        if ($user->isDriver()) {
            return $this->driverReport($user);
        }

        return $this->passengerReport($user);
    }

    private function driverReport($user)
    {
        $trips = Trip::where('driver_id', $user->id)->get();

        return response()->json([
            'rol'                    => 'conductor',
            'total_viajes_creados'   => $trips->count(),
            'viajes_completados'     => $trips->where('status', 'completado')->count(),
            'viajes_cancelados'      => $trips->where('status', 'cancelado')->count(),
            'viajes_activos'         => $trips->whereIn('status', ['publicado', 'confirmado', 'en_curso'])->count(),
            'total_pasajeros'        => TripPassenger::whereIn('trip_id', $trips->pluck('id'))
                                            ->where('status', 'confirmado')->count(),
            'calificacion_promedio'  => $user->rating_avg,
            'total_calificaciones'   => $user->rating_count,
            'viajes_recientes'       => Trip::with('vehicle')
                                            ->where('driver_id', $user->id)
                                            ->orderBy('departure_time', 'desc')
                                            ->take(5)
                                            ->get(),
        ]);
    }

    private function passengerReport($user)
    {
        $participaciones = TripPassenger::where('passenger_id', $user->id)->get();

        return response()->json([
            'rol'                    => 'pasajero',
            'total_viajes_tomados'   => $participaciones->count(),
            'viajes_confirmados'     => $participaciones->where('status', 'confirmado')->count(),
            'viajes_cancelados'      => $participaciones->where('status', 'cancelado')->count(),
            'calificacion_promedio'  => $user->rating_avg,
            'total_calificaciones'   => $user->rating_count,
            'viajes_recientes'       => TripPassenger::with(['trip.driver', 'trip.vehicle'])
                                            ->where('passenger_id', $user->id)
                                            ->orderBy('created_at', 'desc')
                                            ->take(5)
                                            ->get(),
        ]);
    }
}