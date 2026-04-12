# UniRide — Carpooling Universitario 🚗

Proyecto fullstack: **React + Vite** (frontend) + **Laravel 11** (backend API REST).

---

## Estructura

```
uniride-fullstack/
├── frontend/     ← React + Vite + Tailwind CSS
└── backend/      ← Laravel 11 + Sanctum + SQLite
```

---

## 🚀 Cómo correr el proyecto

### Requisitos
- **Node.js** v18+ → https://nodejs.org
- **PHP** 8.2+ → https://www.php.net
- **Composer** → https://getcomposer.org

---

### 1️⃣ Backend (Laravel) — Terminal 1

```bash
cd backend

composer install

cp .env.example .env

php artisan key:generate

php artisan migrate

php artisan serve
```

✅ Backend corriendo en: http://localhost:8000

---

### 2️⃣ Frontend (React) — Terminal 2

```bash
cd frontend

npm install

cp .env.example .env.local

npm run dev
```

✅ Abrir en el navegador: **http://localhost:5173**

---

## ⚙️ Modos

| Modo | Config en frontend/.env.local | Necesita backend? |
|------|-------------------------------|-------------------|
| Demo | `VITE_USE_BACKEND=false` | ❌ No |
| Real | `VITE_USE_BACKEND=true` | ✅ Sí |

El modo **demo** ya viene activado por defecto.

---

## 👤 Cuentas de prueba (modo demo)

| Correo | Contraseña | Rol |
|--------|-----------|-----|
| sara.aranda@unal.edu.co | 123456 | Conductor + Pasajero |
| carlos.m@unal.edu.co | 123456 | Solo conductor |
| diana.r@unal.edu.co | 123456 | Solo pasajera |

El código OTP aparece en la consola del navegador (F12 → Console).

---

## 📡 API Endpoints principales

```
POST   /api/auth/register       Registrar usuario
POST   /api/auth/login          Login → devuelve token
GET    /api/auth/me             Perfil del usuario
GET    /api/trips               Listar viajes disponibles
POST   /api/trips               Crear viaje (conductor)
GET    /api/trips/search        Buscar viajes compatibles
POST   /api/trips/{id}/join     Unirse a un viaje (pasajero)
DELETE /api/trips/{id}/leave    Abandonar un viaje
POST   /api/vehicles            Registrar vehículo
```
