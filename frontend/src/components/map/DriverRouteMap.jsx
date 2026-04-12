import { useEffect, useRef, useState } from 'react'

const NOMINATIM = 'https://nominatim.openstreetmap.org'

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } }
    )
    const data = await res.json()
    return data.display_name?.split(',').slice(0, 2).join(',').trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

async function fetchRoute(waypoints) {
  if (waypoints.length < 2) return null
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';')
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    )
    const data = await res.json()
    if (data.routes?.[0]) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
    }
  } catch {}
  return waypoints.map((w) => [w.lat, w.lng])
}

const POINT_TYPES = [
  { key: 'origin',      label: 'Origen',   color: '#16a34a', hint: 'Haz clic en el mapa para marcar tu punto de partida' },
  { key: 'stop',        label: 'Parada',   color: '#2563eb', hint: 'Haz clic para agregar una parada intermedia (opcional)' },
  { key: 'destination', label: 'Destino',  color: '#dc2626', hint: 'Haz clic en el mapa para marcar el destino final' },
]

export default function DriverRouteMap({ onRouteReady }) {
  const mapRef        = useRef(null)
  const leafletMap    = useRef(null)
  const markersRef    = useRef([])
  const polylineRef   = useRef(null)
  const routeLineRef  = useRef(null)

  const [mode, setMode]         = useState('origin')
  const [waypoints, setWaypoints] = useState([])
  const [loading, setLoading]   = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)
  const [L, setL]               = useState(null)

  useEffect(() => {
    import('leaflet').then((mod) => {
      const Leaflet = mod.default
      delete Leaflet.Icon.Default.prototype._getIconUrl
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setL(Leaflet)
    })
  }, [])

  useEffect(() => {
    if (!L || !mapRef.current || leafletMap.current) return

    const map = L.map(mapRef.current, {
      center:  [4.711, -74.0721],
      zoom:    13,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', handleMapClick)
    leafletMap.current = map

    return () => { map.remove(); leafletMap.current = null }
  }, [L])

  useEffect(() => {
    if (!L || !leafletMap.current) return
    rebuildMap()
  }, [waypoints, L])

  const modeRef = useRef(mode)
  useEffect(() => { modeRef.current = mode }, [mode])

  function handleMapClick(e) {
    const { lat, lng } = e.latlng
    const currentMode = modeRef.current

    setWaypoints((prev) => {
      if (currentMode === 'origin') {
        const filtered = prev.filter((p) => p.type !== 'origin')
        return [{ type: 'origin', lat, lng, label: '' }, ...filtered]
      }
      if (currentMode === 'destination') {
        const filtered = prev.filter((p) => p.type !== 'destination')
        return [...filtered, { type: 'destination', lat, lng, label: '' }]
      }
      const destIdx = prev.findIndex((p) => p.type === 'destination')
      const newStop = { type: 'stop', lat, lng, label: '' }
      if (destIdx >= 0) {
        const copy = [...prev]
        copy.splice(destIdx, 0, newStop)
        return copy
      }
      return [...prev, newStop]
    })
  }

  async function rebuildMap() {
    const map = leafletMap.current
    if (!map) return

    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null }
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null }

    if (waypoints.length === 0) return

    waypoints.forEach((wp, idx) => {
      const color = wp.type === 'origin' ? '#16a34a' : wp.type === 'destination' ? '#dc2626' : '#2563eb'
      const num   = wp.type === 'stop' ? waypoints.filter((w, i) => w.type === 'stop' && i <= idx).length : ''
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z" fill="${color}"/>
          <circle cx="16" cy="16" r="8" fill="white"/>
          <text x="16" y="21" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">${
            wp.type === 'origin' ? 'A' : wp.type === 'destination' ? 'B' : num
          }</text>
        </svg>`
      const icon = L.divIcon({
        html: svg,
        className: '',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42],
      })
      const marker = L.marker([wp.lat, wp.lng], { icon })
        .addTo(map)
        .bindPopup(wp.label || (wp.type === 'origin' ? 'Origen' : wp.type === 'destination' ? 'Destino' : `Parada ${num}`))
      markersRef.current.push(marker)
    })

    if (waypoints.length > 1) {
      map.fitBounds(L.latLngBounds(waypoints.map((w) => [w.lat, w.lng])), { padding: [40, 40] })
    }

    if (waypoints.length >= 2) {
      setLoading(true)
      const routeCoords = await fetchRoute(waypoints)
      setLoading(false)
      if (routeCoords && leafletMap.current) {
        routeLineRef.current = L.polyline(routeCoords, {
          color: '#1a3a5c',
          weight: 5,
          opacity: 0.85,
          dashArray: null,
        }).addTo(leafletMap.current)
      }


      let totalDist = 0
      for (let i = 0; i < waypoints.length - 1; i++) {
        const a = L.latLng(waypoints[i].lat, waypoints[i].lng)
        const b = L.latLng(waypoints[i + 1].lat, waypoints[i + 1].lng)
        totalDist += a.distanceTo(b)
      }
      const distKm  = (totalDist / 1000).toFixed(1)
      const minutes = Math.round((totalDist / 1000 / 35) * 60)
      setRouteInfo({ distance: distKm, duration: minutes })
    } else {
      setRouteInfo(null)
    }

    waypoints.forEach(async (wp, idx) => {
      if (wp.label) return
      const label = await reverseGeocode(wp.lat, wp.lng)
      setWaypoints((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, label } : p))
      )
    })
  }

  function removeWaypoint(idx) {
    setWaypoints((prev) => prev.filter((_, i) => i !== idx))
  }

  function clearAll() {
    setWaypoints([])
    setRouteInfo(null)
  }

  const origin      = waypoints.find((w) => w.type === 'origin')
  const destination = waypoints.find((w) => w.type === 'destination')
  const stops       = waypoints.filter((w) => w.type === 'stop')
  const canPublish  = origin && destination

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {POINT_TYPES.map((pt) => (
          <button
            key={pt.key}
            onClick={() => setMode(pt.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150
              ${mode === pt.key
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            style={mode === pt.key ? { background: pt.color } : {}}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: mode === pt.key ? 'white' : pt.color }}
            />
            {pt.label}
          </button>
        ))}
        {waypoints.length > 0 && (
          <button
            onClick={clearAll}
            className="ml-auto px-3 py-2 text-xs text-slate-400 hover:text-rose-500 border border-slate-200 rounded-lg bg-white transition-colors"
          >
            Limpiar todo
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 -mt-2">
        {POINT_TYPES.find((p) => p.key === mode)?.hint}
      </p>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-200 min-h-[420px]">
          <div ref={mapRef} className="absolute inset-0" />
          {loading && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-600 shadow-sm flex items-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin text-[#1a3a5c]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Trazando ruta...
            </div>
          )}
        </div>

        <div className="w-64 flex flex-col gap-3 flex-shrink-0">
          <div className="bg-white border border-slate-100 rounded-xl p-4 flex-1 overflow-auto">
            <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Puntos de la ruta</p>

            {waypoints.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-6">
                Selecciona el modo y haz clic en el mapa para agregar puntos
              </p>
            )}

            <div className="space-y-2">
              {waypoints.map((wp, idx) => {
                const color = wp.type === 'origin' ? '#16a34a' : wp.type === 'destination' ? '#dc2626' : '#2563eb'
                const typeLabel = wp.type === 'origin' ? 'Origen' : wp.type === 'destination' ? 'Destino' : 'Parada'
                return (
                  <div key={idx} className="flex items-start gap-2 group">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: color }}
                    >
                      {wp.type === 'origin' ? 'A' : wp.type === 'destination' ? 'B' : idx}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-slate-400">{typeLabel}</p>
                      <p className="text-xs text-slate-700 leading-tight truncate">
                        {wp.label || 'Cargando dirección...'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeWaypoint(idx)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400 transition-all flex-shrink-0 mt-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {routeInfo && (
            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Resumen</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-semibold text-slate-800">{routeInfo.distance} km</p>
                  <p className="text-[10px] text-slate-400">Distancia</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-semibold text-slate-800">{routeInfo.duration} min</p>
                  <p className="text-[10px] text-slate-400">Duración est.</p>
                </div>
              </div>
              <div className="mt-2 text-center">
                <p className="text-[10px] text-slate-400">{stops.length} parada{stops.length !== 1 ? 's' : ''} intermedia{stops.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          <button
            disabled={!canPublish}
            onClick={() => onRouteReady?.({ waypoints, routeInfo })}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-150
              bg-[#1a3a5c] text-white hover:bg-[#2a4f7c] active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {canPublish ? 'Continuar con esta ruta →' : 'Marca origen y destino'}
          </button>
        </div>
      </div>
    </div>
  )
}
