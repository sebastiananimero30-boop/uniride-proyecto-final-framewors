<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TripController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\TripPassengerController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ReportController;

// Handle OPTIONS preflight
Route::options('{any}', function() {
    return response('', 204)
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
})->where('any', '.*');

// Rutas públicas
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

Route::get('/route-proxy', function (Request $request) {
    $request->validate([
        'coordinates' => ['required', 'string', 'regex:/^-?\d+(\.\d+)?,-?\d+(\.\d+)?(?:;-?\d+(\.\d+)?,-?\d+(\.\d+)?)+$/'],
    ]);

    $response = Http::timeout(10)->acceptJson()->get(
        'https://router.project-osrm.org/route/v1/driving/' . $request->query('coordinates'),
        [
            'overview' => 'full',
            'geometries' => 'geojson',
        ]
    );

    if ($response->failed()) {
        return response()->json([
            'message' => 'No fue posible obtener la ruta.',
        ], 502);
    }

    return response($response->body(), 200)
        ->header('Content-Type', 'application/json');
});

// Rutas protegidas
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // Vehículos y viajes (solo conductores)
    Route::middleware('role:conductor')->group(function () {
        Route::post('/vehicles',           [VehicleController::class, 'store']);
        Route::get('/vehicles/my',         [VehicleController::class, 'show']);
        Route::post('/trips',              [TripController::class, 'store']);
        Route::get('/trips/my',            [TripController::class, 'myTrips']);
        Route::patch('/trips/{id}/status', [TripController::class, 'updateStatus']);
    });

    // Viajes (todos los autenticados)
    Route::get('/trips/search', [TripPassengerController::class, 'search']);
    Route::get('/trips',        [TripController::class, 'index']);
    Route::get('/trips/{id}',   [TripController::class, 'show']);

    // Pasajeros (solo pasajeros)
    Route::middleware('role:pasajero')->group(function () {
        Route::post('/trips/{id}/join',   [TripPassengerController::class, 'join']);
        Route::delete('/trips/{id}/leave',[TripPassengerController::class, 'leave']);
        Route::get('/passenger/my-trips', [TripPassengerController::class, 'myTrips']);
    });

    // Calificaciones
    Route::post('/trips/{id}/rate',     [RatingController::class, 'store']);
    Route::get('/users/{id}/ratings',   [RatingController::class, 'userRatings']);

    // Notificaciones
    Route::get('/notifications',             [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all',  [NotificationController::class, 'markAllAsRead']);

    // Reporte
    Route::get('/report/dashboard', [ReportController::class, 'dashboard']);
});
