import { useState, lazy, Suspense, useEffect, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import {
  apiGetTrips, apiMyTripsDriver, apiMyTripsPassenger,
  apiCreateTrip, apiJoinTrip, apiLeaveTrip,
  apiGetMyVehicle, apiCreateVehicle,
  apiGetNotifications, apiMarkAllNotificationsRead,
  apiGetUserRatings, apiUpdateTripStatus,
} from '../services/api'

const DriverRouteMap    = lazy(() => import('../components/map/DriverRouteMap'))
const PassengerRouteMap = lazy(() => import('../components/map/PassengerRouteMap'))

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

function MapLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm gap-2">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Cargando mapa...
    </div>
  )
}

const STATUS_MAP = {
  publicado:  { label: 'Publicado',  classes: 'bg-blue-50 text-blue-700 border border-blue-200'          },
  confirmado: { label: 'Confirmado', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  en_curso:   { label: 'En curso',   classes: 'bg-amber-50 text-amber-700 border border-amber-200'       },
  completado: { label: 'Completado', classes: 'bg-slate-100 text-slate-500 border border-slate-200'      },
  cancelado:  { label: 'Cancelado',  classes: 'bg-red-50 text-red-500 border border-red-200'             },
  available:  { label: 'Disponible', classes: 'bg-blue-50 text-blue-700 border border-blue-200'          },
}

function Spots({ taken, total }) {
  return (
    <div className="flex items-center gap-1 mt-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i < taken ? 'bg-[#1a3a5c]' : 'bg-slate-100 border border-slate-300'}`} />
      ))}
      <span className="text-xs text-slate-400 ml-1.5">
        {taken < total ? `${total - taken} libre${total - taken > 1 ? 's' : ''}` : 'Lleno'}
      </span>
    </div>
  )
}

function MetricCard({ label, value, sub, subColor }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1.5">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 leading-none">{value}</p>
      <p className={`text-xs mt-1.5 ${subColor || 'text-slate-400'}`}>{sub}</p>
    </div>
  )
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  if (!msg) return null
  const colors = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow text-sm ${colors}`}>
      {type === 'error' ? '✕' : '✓'} {msg}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100">✕</button>
    </div>
  )
}

function PublishTripForm({ routeData, vehicle, onPublished, onCancel }) {
  const [form, setForm] = useState({
    departure_time: '',
    available_seats: vehicle?.seats || 4,
    price_per_seat: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const origin      = routeData?.waypoints?.find(w => w.type === 'origin')
  const destination = routeData?.waypoints?.find(w => w.type === 'destination')

  async function handleSubmit() {
    if (!form.departure_time) { setError('Selecciona la fecha y hora de salida'); return }
    setLoading(true); setError('')
    try {
      await apiCreateTrip({
        vehicle_id:      vehicle.id,
        origin:          origin?.label || 'Origen',
        origin_lat:      origin?.lat,
        origin_lng:      origin?.lng,
        destination:     destination?.label || 'Destino',
        destination_lat: destination?.lat,
        destination_lng: destination?.lng,
        departure_time:  form.departure_time,
        available_seats: Number(form.available_seats),
        price_per_seat:  form.price_per_seat ? Number(form.price_per_seat) : 0,
        notes:           form.notes,
      })
      onPublished()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-white border border-slate-100 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Detalles del viaje</h2>
      <p className="text-xs text-slate-400 mb-5">Confirma los datos antes de publicar</p>

      <div className="flex gap-3 mb-5 p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 mb-0.5">Origen</p>
          <p className="font-medium truncate">{origin?.label || '—'}</p>
        </div>
        <div className="text-slate-300 self-center">→</div>
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 mb-0.5">Destino</p>
          <p className="font-medium truncate">{destination?.label || '—'}</p>
        </div>
      </div>

      {vehicle && (
        <div className="mb-5 p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
          <p className="text-[10px] text-slate-400 mb-0.5">Vehículo</p>
          <p className="font-medium">{vehicle.brand} {vehicle.model} · {vehicle.plate} · {vehicle.color}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Fecha y hora de salida *</label>
          <input
            type="datetime-local"
            value={form.departure_time}
            onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Asientos disponibles</label>
            <input
              type="number" min={1} max={8}
              value={form.available_seats}
              onChange={e => setForm(f => ({ ...f, available_seats: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Precio por cupo (COP)</label>
            <input
              type="number" min={0} placeholder="0 = gratis"
              value={form.price_per_seat}
              onChange={e => setForm(f => ({ ...f, price_per_seat: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c]"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Notas adicionales</label>
          <textarea
            rows={2} placeholder="Ej: Recojo en la esquina, no fumadores..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <div className="flex gap-3 mt-6">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-500 hover:bg-slate-50">
          Volver al mapa
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#1a3a5c] text-white hover:bg-[#2a4f7c] disabled:opacity-50"
        >
          {loading ? 'Publicando...' : 'Publicar viaje'}
        </button>
      </div>
    </div>
  )
}

function VehicleForm({ onSaved }) {
  const [form, setForm] = useState({ brand: '', model: '', plate: '', color: '', seats: 4 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!form.brand || !form.model || !form.plate || !form.color) {
      setError('Completa todos los campos'); return
    }
    setLoading(true); setError('')
    try {
      const res = await apiCreateVehicle({ ...form, seats: Number(form.seats) })
      onSaved(res.vehicle)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Registra tu vehículo</h2>
      <p className="text-xs text-slate-400 mb-5">Necesitas un vehículo para publicar viajes</p>
      <div className="space-y-3">
        {[['brand','Marca','Ej: Toyota'],['model','Modelo','Ej: Corolla'],['plate','Placa','Ej: ABC-123'],['color','Color','Ej: Blanco']].map(([k,l,p]) => (
          <div key={k}>
            <label className="text-xs font-medium text-slate-600 block mb-1">{l}</label>
            <input
              placeholder={p}
              value={form[k]}
              onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c]"
            />
          </div>
        ))}
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Número de asientos</label>
          <input
            type="number" min={1} max={8}
            value={form.seats}
            onChange={e => setForm(f => ({ ...f, seats: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c]"
          />
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-5 py-2.5 rounded-xl text-sm font-medium bg-[#1a3a5c] text-white hover:bg-[#2a4f7c] disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Registrar vehículo'}
      </button>
    </div>
  )
}

const nextStatus = {
  publicado:  ['confirmado', 'cancelado'],
  confirmado: ['en_curso',   'cancelado'],
  en_curso:   ['completado', 'cancelado'],
}

export default function Dashboard({ user, onLogout }) {
  const [activeRole, setActiveRole] = useState(['passenger','pasajero'].includes(user.role) ? 'passenger' : ['conductor','driver','both'].includes(user.role) ? 'driver' : 'driver')
  const [activeNav,  setActiveNav]  = useState('home')

  const [driverTrips,    setDriverTrips]    = useState([])
  const [passengerTrips, setPassengerTrips] = useState([])
  const [availableTrips, setAvailableTrips] = useState([])
  const [vehicle,        setVehicle]        = useState(null)
  const [notifications,  setNotifications]  = useState([])
  const [ratings,        setRatings]        = useState(null)
  const [dataLoading,    setDataLoading]    = useState(false)

  const [routeData,   setRouteData]   = useState(null)
  const [publishStep, setPublishStep] = useState('map')
  const [filterDay,   setFilterDay]   = useState('Todos')
  const [toast,       setToast]       = useState(null)
  const isMobile = useIsMobile()

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const loadData = useCallback(async () => {
    if (!USE_BACKEND) return
    setDataLoading(true)
    try {
      if (activeRole === 'driver') {
        const [trips, veh] = await Promise.allSettled([apiMyTripsDriver(), apiGetMyVehicle()])
        if (trips.status === 'fulfilled') setDriverTrips(trips.value)
        if (veh.status === 'fulfilled')   setVehicle(veh.value)
      } else {
        const [avail, myT] = await Promise.allSettled([apiGetTrips(), apiMyTripsPassenger()])
        if (avail.status === 'fulfilled') setAvailableTrips(avail.value)
        if (myT.status  === 'fulfilled') setPassengerTrips(myT.value)
      }
      const notifs = await apiGetNotifications().catch(() => [])
      setNotifications(Array.isArray(notifs) ? notifs : notifs?.data || [])
    } catch {}
    setDataLoading(false)
  }, [activeRole])

  useEffect(() => { loadData() }, [loadData])

  async function loadRatings() {
    if (!USE_BACKEND) return
    try {
      const res = await apiGetUserRatings(user.id)
      setRatings(res)
    } catch {}
  }

  async function handleJoinTrip(tripId) {
    try {
      await apiJoinTrip(tripId)
      showToast('¡Te uniste al viaje exitosamente!')
      loadData()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function handleLeaveTrip(tripId) {
    try {
      await apiLeaveTrip(tripId)
      showToast('Cancelaste tu participación.')
      loadData()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function handleStatusChange(tripId, status) {
    try {
      await apiUpdateTripStatus(tripId, status)
      showToast('Estado actualizado.')
      loadData()
    } catch (e) { showToast(e.message, 'error') }
  }

  const navDriver = [
    { id: 'home',    label: 'Inicio'        },
    { id: 'trips',   label: 'Mis viajes'    },
    { id: 'publish', label: 'Publicar viaje'},
    { id: 'history', label: 'Historial'     },
    { id: 'ratings', label: 'Calificaciones'},
    { id: 'profile', label: 'Perfil'        },
  ]
  const navPassenger = [
    { id: 'home',     label: 'Inicio'        },
    { id: 'search',   label: 'Buscar viaje'  },
    { id: 'bookings', label: 'Mis reservas'  },
    { id: 'history',  label: 'Historial'     },
    { id: 'ratings',  label: 'Calificaciones'},
    { id: 'profile',  label: 'Perfil'        },
  ]
  const navItems = activeRole === 'driver' ? navDriver : navPassenger

  function handleNavClick(id) {
    setActiveNav(id)
    if (id === 'publish') { setPublishStep('map'); setRouteData(null) }
    if (id === 'ratings') loadRatings()
  }

  const today    = new Date().toDateString()
  const tomorrow = new Date(Date.now() + 86400000).toDateString()
  function filterTrips(trips) {
    if (filterDay === 'Todos') return trips
    return trips.filter(t => {
      const d = new Date(t.departure_time).toDateString()
      if (filterDay === 'Hoy')    return d === today
      if (filterDay === 'Mañana') return d === tomorrow
      if (filterDay === 'AM')     return new Date(t.departure_time).getHours() < 12
      if (filterDay === 'PM')     return new Date(t.departure_time).getHours() >= 12
      return true
    })
  }

  const filteredAvailable  = filterTrips(availableTrips)
  const completedDriver    = driverTrips.filter(t => t.status === 'completado').length
  const activeDriverTrips  = driverTrips.filter(t => !['completado','cancelado'].includes(t.status))
  const completedPassenger = passengerTrips.filter(t => t.status === 'confirmado').length
  const activePassenger    = passengerTrips.filter(t => t.status === 'confirmado')
  const unreadNotifs       = notifications.filter(n => !n.read_at).length

  const topbarTitle =
    activeNav === 'publish'  ? 'Publicar viaje'       :
    activeNav === 'search'   ? 'Buscar viaje'          :
    activeNav === 'trips'    ? 'Mis viajes'            :
    activeNav === 'bookings' ? 'Mis reservas'          :
    activeNav === 'history'  ? 'Historial'             :
    activeNav === 'ratings'  ? 'Calificaciones'        :
    activeNav === 'profile'  ? 'Mi perfil'             :
    activeRole === 'driver'  ? 'Panel de conductor'    : 'Inicio'

  // Iconos para nav móvil
  const navIcons = {
    home:     <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
    trips:    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
    publish:  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
    search:   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
    bookings: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
    history:  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    ratings:  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
    profile:  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  }

  // Nav móvil — solo los 4 más importantes
  const mobileNavDriver    = navDriver.filter(n => ['home','trips','publish','profile'].includes(n.id))
  const mobileNavPassenger = navPassenger.filter(n => ['home','search','bookings','profile'].includes(n.id))
  const mobileNavItems     = activeRole === 'driver' ? mobileNavDriver : mobileNavPassenger

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sidebar — oculto en móvil */}
      <aside className="w-56 bg-white border-r border-slate-100 flex-col flex-shrink-0" style={{display: isMobile ? "none" : "flex"}}>
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#1a3a5c] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-none">UniRide</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Carpooling universitario</p>
            </div>
          </div>
        </div>

        {user.role === 'both' && (
          <div className="mx-3 mt-3 flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {['driver','passenger'].map((r) => (
              <button key={r} onClick={() => { setActiveRole(r); setActiveNav('home') }}
                className={`flex-1 py-1.5 text-[11px] rounded-md font-medium transition-all duration-150
                  ${activeRole === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {r === 'driver' ? 'Conductor' : 'Pasajero'}
              </button>
            ))}
          </div>
        )}

        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider px-3 mb-2">
            {activeRole === 'driver' ? 'Conductor' : 'Pasajero'}
          </p>
          {navItems.map((item) => (
            <button key={item.id} onClick={() => handleNavClick(item.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 mb-0.5 transition-all duration-100
                ${activeNav === item.id
                  ? 'bg-[#1a3a5c]/8 text-[#1a3a5c] font-medium border-l-2 border-[#1a3a5c] pl-[10px]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeNav === item.id ? 'bg-[#1a3a5c]' : 'bg-slate-300'}`} />
              {item.label}
              {item.id === 'home' && unreadNotifs > 0 && (
                <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium">{unreadNotifs}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {user.avatar || user.name?.slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-800 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400">{activeRole === 'driver' ? 'Conductor' : 'Pasajero'}</p>
          </div>
          <button onClick={onLogout} className="text-slate-300 hover:text-slate-500 transition-colors" title="Cerrar sesión">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-slate-800">{topbarTitle}</h1>
            {dataLoading && <p className="text-[10px] text-slate-400 mt-0.5">Actualizando...</p>}
          </div>
          <div className="flex items-center gap-2">
            {unreadNotifs > 0 && (
              <button onClick={async () => { await apiMarkAllNotificationsRead().catch(()=>{}); loadData() }}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">
                🔔 {unreadNotifs} nueva{unreadNotifs > 1 ? 's' : ''}
              </button>
            )}
            <button onClick={() => handleNavClick(activeRole === 'driver' ? 'publish' : 'search')}
              className="px-3 py-1.5 text-xs bg-[#1a3a5c] text-white rounded-lg hover:bg-[#2a4f7c] transition-colors font-medium">
              {activeRole === 'driver' ? '+ Publicar viaje' : 'Buscar viaje'}
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-auto ${['publish','search'].includes(activeNav) ? 'p-3 md:p-4' : 'p-4 md:p-6'} pb-20 md:pb-6`}>

          {/* PUBLICAR VIAJE */}
          {activeNav === 'publish' && activeRole === 'driver' && (
            <div className="h-full">
              {USE_BACKEND && !vehicle ? (
                <VehicleForm onSaved={(v) => { setVehicle(v); showToast('Vehículo registrado.') }} />
              ) : publishStep === 'map' ? (
                <Suspense fallback={<MapLoader />}>
                  <DriverRouteMap onRouteReady={(data) => {
                    setRouteData(data)
                    if (USE_BACKEND) setPublishStep('form')
                    else { showToast('Ruta guardada (modo demo)'); setActiveNav('home') }
                  }} />
                </Suspense>
              ) : (
                USE_BACKEND && vehicle && routeData && (
                  <PublishTripForm
                    routeData={routeData} vehicle={vehicle}
                    onPublished={() => { showToast('¡Viaje publicado!'); setPublishStep('map'); setRouteData(null); setActiveNav('trips'); loadData() }}
                    onCancel={() => setPublishStep('map')}
                  />
                )
              )}
            </div>
          )}

          {/* BUSCAR VIAJE */}
          {activeNav === 'search' && activeRole === 'passenger' && (
            <div className="h-full">
              <Suspense fallback={<MapLoader />}>
                <PassengerRouteMap onSelectRoute={() => setActiveNav('bookings')} />
              </Suspense>
            </div>
          )}

          {/* CONDUCTOR HOME */}
          {activeRole === 'driver' && activeNav === 'home' && (
            <div>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <MetricCard label="Viajes completados" value={USE_BACKEND ? completedDriver : '14'} sub="Total histórico" subColor="text-emerald-500" />
                <MetricCard label="Viajes activos"     value={USE_BACKEND ? activeDriverTrips.length : '2'} sub="Publicados o confirmados" />
                <MetricCard label="Calificación"       value={user.rating_avg ? `${user.rating_avg} ★` : '—'} sub={user.rating_count ? `${user.rating_count} reseñas` : 'Sin calificaciones'} />
                <MetricCard label="Vehículo"           value={vehicle ? vehicle.plate : '—'} sub={vehicle ? `${vehicle.brand} ${vehicle.model}` : 'No registrado'} />
              </div>
              <div className="grid grid-cols-[1fr_300px] gap-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-700">Viajes activos</h2>
                    <button onClick={() => handleNavClick('trips')} className="text-xs text-[#1a3a5c] font-medium hover:underline">Ver todos →</button>
                  </div>
                  {activeDriverTrips.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-xl p-8 text-center">
                      <p className="text-slate-400 text-sm">No tienes viajes activos</p>
                      <button onClick={() => handleNavClick('publish')} className="mt-3 text-xs text-[#1a3a5c] font-medium hover:underline">Publicar un viaje →</button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeDriverTrips.slice(0,4).map((t) => {
                        const s = STATUS_MAP[t.status] || STATUS_MAP.publicado
                        const taken = (t.vehicle?.seats || 4) - (t.available_seats || 0)
                        return (
                          <div key={t.id} className="bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                            <div className="flex items-start justify-between mb-1.5">
                              <p className="text-sm font-medium text-slate-800">{t.origin} → {t.destination}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${s.classes}`}>{s.label}</span>
                            </div>
                            <p className="text-xs text-slate-400">{fmtDate(t.departure_time)}</p>
                            <Spots taken={taken} total={t.vehicle?.seats || 4} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-slate-700 mb-3">Notificaciones</h2>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Sin notificaciones</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.slice(0,5).map((n) => (
                        <div key={n.id} className={`p-2.5 rounded-lg text-xs ${n.read_at ? 'text-slate-400' : 'bg-blue-50 text-slate-700 font-medium'}`}>
                          {n.message}
                          <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(n.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CONDUCTOR MIS VIAJES */}
          {activeRole === 'driver' && activeNav === 'trips' && (
            <div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {['Todos','Hoy','Mañana','AM','PM'].map(f => (
                  <button key={f} onClick={() => setFilterDay(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                      ${filterDay === f ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}>
                    {f}
                  </button>
                ))}
              </div>
              {filterTrips(driverTrips).length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-xl p-12 text-center">
                  <p className="text-slate-400 text-sm mb-3">No tienes viajes registrados</p>
                  <button onClick={() => handleNavClick('publish')} className="text-xs bg-[#1a3a5c] text-white px-4 py-2 rounded-lg hover:bg-[#2a4f7c]">
                    Publicar primer viaje
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filterTrips(driverTrips).map((t) => {
                    const s = STATUS_MAP[t.status] || STATUS_MAP.publicado
                    const taken = (t.vehicle?.seats || 4) - (t.available_seats || 0)
                    const nexts = nextStatus[t.status] || []
                    return (
                      <div key={t.id} className="bg-white border border-slate-100 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{t.origin} → {t.destination}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{fmtDate(t.departure_time)}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${s.classes}`}>{s.label}</span>
                        </div>
                        <Spots taken={taken} total={t.vehicle?.seats || 4} />
                        {t.notes && <p className="text-xs text-slate-400 mt-2 italic">{t.notes}</p>}
                        {nexts.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {nexts.map(ns => (
                              <button key={ns} onClick={() => handleStatusChange(t.id, ns)}
                                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
                                  ${ns === 'cancelado' ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#1a3a5c]/5'}`}>
                                {STATUS_MAP[ns]?.label || ns}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* PASAJERO HOME */}
          {activeRole === 'passenger' && activeNav === 'home' && (
            <div>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <MetricCard label="Viajes tomados"   value={USE_BACKEND ? completedPassenger : '9'} sub="Total" subColor="text-emerald-500" />
                <MetricCard label="Reservas activas" value={USE_BACKEND ? activePassenger.length : '2'} sub="Esta semana" />
                <MetricCard label="Mi calificación"  value={user.rating_avg ? `${user.rating_avg} ★` : '—'} sub={user.rating_count ? `${user.rating_count} reseñas` : 'Sin calificaciones'} />
                <MetricCard label="Cancelaciones"    value="0" sub="Sin cancelaciones" subColor="text-emerald-500" />
              </div>
              <div className="grid grid-cols-[1fr_300px] gap-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-700">Viajes disponibles</h2>
                    <button onClick={() => handleNavClick('search')} className="text-xs text-[#1a3a5c] font-medium hover:underline">Ver en mapa →</button>
                  </div>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {['Todos','Hoy','Mañana','AM','PM'].map(f => (
                      <button key={f} onClick={() => setFilterDay(f)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                          ${filterDay === f ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                  {filteredAvailable.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-xl p-8 text-center">
                      <p className="text-slate-400 text-sm">No hay viajes disponibles</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredAvailable.map((t) => {
                        const taken = (t.vehicle?.seats || 4) - (t.available_seats || 0)
                        return (
                          <div key={t.id} className="bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                            <div className="flex items-start justify-between mb-1.5">
                              <p className="text-sm font-medium text-slate-800">{t.origin} → {t.destination}</p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 bg-blue-50 text-blue-700 border border-blue-200">Disponible</span>
                            </div>
                            <div className="flex gap-4 text-xs text-slate-400 flex-wrap">
                              <span>{fmtDate(t.departure_time)}</span>
                              <span>Conductor: {t.driver?.name || '—'}</span>
                              {t.driver?.rating_avg && <span>★ {t.driver.rating_avg}</span>}
                              {t.price_per_seat > 0 && <span>${t.price_per_seat.toLocaleString()}/cupo</span>}
                            </div>
                            <Spots taken={taken} total={t.vehicle?.seats || 4} />
                            {t.notes && <p className="text-xs text-slate-400 mt-1 italic">{t.notes}</p>}
                            <button onClick={() => handleJoinTrip(t.id)}
                              className="mt-3 text-xs bg-[#1a3a5c] text-white px-3 py-1.5 rounded-lg hover:bg-[#2a4f7c] transition-colors font-medium">
                              Solicitar cupo →
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">Mis reservas activas</h2>
                    {activePassenger.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Sin reservas activas</p>
                    ) : (
                      <div className="space-y-2.5">
                        {activePassenger.map((tp) => {
                          const t = tp.trip || tp
                          return (
                            <div key={tp.id} className="border border-slate-100 rounded-lg p-3">
                              <p className="text-xs font-medium text-slate-800 mb-1">{t.origin} → {t.destination}</p>
                              <p className="text-[11px] text-slate-400 mb-2">{fmtDate(t.departure_time)} · {t.driver?.name || '—'}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmado</span>
                                <button onClick={() => handleLeaveTrip(t.id)} className="text-[10px] text-red-400 hover:text-red-600 hover:underline">Cancelar</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">Notificaciones</h2>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">Sin notificaciones</p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.slice(0,4).map((n) => (
                          <div key={n.id} className={`p-2.5 rounded-lg text-xs ${n.read_at ? 'text-slate-400' : 'bg-blue-50 text-slate-700 font-medium'}`}>
                            {n.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASAJERO MIS RESERVAS */}
          {activeRole === 'passenger' && activeNav === 'bookings' && (
            <div>
              <div className="flex gap-2 mb-4">
                {['Todos','Hoy','Mañana','AM','PM'].map(f => (
                  <button key={f} onClick={() => setFilterDay(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                      ${filterDay === f ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]' : 'border-slate-200 text-slate-500 bg-white'}`}>
                    {f}
                  </button>
                ))}
              </div>
              {passengerTrips.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-xl p-12 text-center">
                  <p className="text-slate-400 text-sm mb-3">No tienes reservas</p>
                  <button onClick={() => handleNavClick('home')} className="text-xs text-[#1a3a5c] font-medium hover:underline">Ver viajes disponibles →</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {passengerTrips.map((tp) => {
                    const t = tp.trip || tp
                    const s = STATUS_MAP[tp.status] || STATUS_MAP.confirmado
                    return (
                      <div key={tp.id} className="bg-white border border-slate-100 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{t.origin} → {t.destination}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{fmtDate(t.departure_time)} · {t.driver?.name || '—'}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${s.classes}`}>{s.label}</span>
                        </div>
                        {tp.status === 'confirmado' && (
                          <button onClick={() => handleLeaveTrip(t.id)}
                            className="mt-2 text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50">
                            Cancelar reserva
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* HISTORIAL */}
          {activeNav === 'history' && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-4">
                {activeRole === 'driver' ? 'Viajes completados o cancelados' : 'Viajes tomados'}
              </h2>
              {(() => {
                const trips = activeRole === 'driver'
                  ? driverTrips.filter(t => ['completado','cancelado'].includes(t.status))
                  : passengerTrips.filter(t => t.status !== 'confirmado')
                if (trips.length === 0) return (
                  <div className="bg-white border border-slate-100 rounded-xl p-12 text-center">
                    <p className="text-slate-400 text-sm">Sin historial aún</p>
                  </div>
                )
                return (
                  <div className="space-y-3">
                    {trips.map((t) => {
                      const trip = t.trip || t
                      const s = STATUS_MAP[t.status] || STATUS_MAP.completado
                      return (
                        <div key={t.id} className="bg-white border border-slate-100 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{trip.origin} → {trip.destination}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{fmtDate(trip.departure_time)}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${s.classes}`}>{s.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {/* CALIFICACIONES */}
          {activeNav === 'ratings' && (
            <div className="max-w-lg">
              <div className="bg-white border border-slate-100 rounded-xl p-5 mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-slate-800">{ratings?.user?.rating_avg || user.rating_avg || '—'}</span>
                  <div>
                    <p className="text-amber-500 text-lg">{'★'.repeat(Math.round(ratings?.user?.rating_avg || 0))}{'☆'.repeat(5 - Math.round(ratings?.user?.rating_avg || 0))}</p>
                    <p className="text-xs text-slate-400">{ratings?.user?.rating_count || user.rating_count || 0} calificaciones</p>
                  </div>
                </div>
              </div>
              {!ratings ? (
                <div className="bg-white border border-slate-100 rounded-xl p-8 text-center">
                  <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
              ) : ratings.ratings?.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-xl p-8 text-center">
                  <p className="text-slate-400 text-sm">Sin calificaciones aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratings.ratings?.map((r) => (
                    <div key={r.id} className="bg-white border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-800">{r.rater?.name || 'Usuario'}</p>
                        <p className="text-amber-500">{'★'.repeat(r.score)}{'☆'.repeat(5-r.score)}</p>
                      </div>
                      {r.comment && <p className="text-xs text-slate-500 italic">"{r.comment}"</p>}
                      <p className="text-[10px] text-slate-400 mt-1">{fmtDate(r.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PERFIL */}
          {activeNav === 'profile' && (
            <div className="max-w-md">
              <div className="bg-white border border-slate-100 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-xl font-semibold">
                    {user.avatar || user.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-800">{user.name}</p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{user.role === 'both' ? 'Conductor & Pasajero' : user.role === 'pasajero' ? 'Pasajero' : user.role === 'conductor' ? 'Conductor' : user.role}</p>
                  </div>
                </div>
                <div className="space-y-0">
                  {[
                    ['Nombre',       user.name],
                    ['Correo',       user.email],
                    ['Rol',          user.role === 'both' ? 'Conductor & Pasajero' : user.role === 'pasajero' ? 'Pasajero' : user.role === 'conductor' ? 'Conductor' : user.role],
                    ['Calificación', user.rating_avg ? `${user.rating_avg} ★` : 'Sin calificaciones'],
                    ['Universidad',  user.university || '—'],
                    ['Teléfono',     user.phone || '—'],
                  ].map(([k,v]) => (
                    <div key={k} className="flex justify-between py-2.5 border-b border-slate-50 last:border-0 text-sm">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-medium text-slate-700">{v}</span>
                    </div>
                  ))}
                </div>
                {activeRole === 'driver' && vehicle && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Mi vehículo</h3>
                    {[
                      ['Marca',    vehicle.brand],
                      ['Modelo',   vehicle.model],
                      ['Placa',    vehicle.plate],
                      ['Color',    vehicle.color],
                      ['Asientos', vehicle.seats],
                    ].map(([k,v]) => (
                      <div key={k} className="flex justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
                        <span className="text-slate-500">{k}</span>
                        <span className="font-medium text-slate-700">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={onLogout}
                  className="mt-6 w-full py-2.5 rounded-xl text-sm border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}

        </div>

      {/* Bottom Nav — solo móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative
                ${activeNav === item.id ? 'text-[#1a3a5c]' : 'text-slate-400'}`}
            >
              {navIcons[item.id]}
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.id === 'home' && unreadNotifs > 0 && (
                <span className="absolute top-0 right-1 text-[9px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">{unreadNotifs}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
      </main>
    </div>
  )
}
