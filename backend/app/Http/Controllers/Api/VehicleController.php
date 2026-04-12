<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function store(Request $request)
    {
        if ($request->user()->vehicle) {
            return response()->json([
                'message' => 'Ya tienes un vehículo registrado.'
            ], 422);
        }

        $request->validate([
            'brand'  => 'required|string',
            'model'  => 'required|string',
            'plate'  => 'required|string|unique:vehicles',
            'color'  => 'required|string',
            'seats'  => 'required|integer|min:1|max:8',
        ]);

        $vehicle = Vehicle::create([
            'user_id' => $request->user()->id,
            'brand'   => $request->brand,
            'model'   => $request->model,
            'plate'   => $request->plate,
            'color'   => $request->color,
            'seats'   => $request->seats,
        ]);

        return response()->json([
            'message' => 'Vehículo registrado exitosamente.',
            'vehicle' => $vehicle,
        ], 201);
    }

    public function show(Request $request)
    {
        $vehicle = $request->user()->vehicle;

        if (!$vehicle) {
            return response()->json(['message' => 'No tienes vehículo registrado.'], 404);
        }

        return response()->json($vehicle);
    }
}