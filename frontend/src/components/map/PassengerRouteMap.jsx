import { useEffect, useRef, useState, useCallback } from 'react'

const NOMINATIM = 'https://nominatim.openstreetmap.org'

async function geocode(query) {
  const res = await fetch(
    `${NOMINATIM}/search?format=jsonv2&q=${encodeURIComponent(query + ', Bogotá, Colombia')}&limit=5&accept-language=es`
  )
  return res.json()
}

const MOCK_ROUTES = [
  {
    id: 1,
    driver: 'Carlos M.',
    rating: 4.7,
    avatar: 'CM',
    time: '7:00 AM',
    seats: 2,
    waypoints: [
      { lat: 4.6532, lng: -74.0638, label: 'Chapinero' },
      { lat: 4.6276, lng: -74.0659, label: 'Teusaquillo' },
      { lat: 4.6356, lng: -74.0837, label: 'Ciudad Universitaria' },
    ],
    color: '#2563eb',
  },
  {
    id: 2,
    driver: 'Diana R.',
    rating: 5.0,
    avatar: 'DR',
    time: '6:45 AM',
    seats: 3,
    waypoints: [
      { lat: 4.7396, lng: -74.1015, label: 'Suba' },
      { lat: 4.6946, lng: -74.0869, label: 'Engativá' },
      { lat: 4.6356, lng: -74.0837, label: 'Ciudad Universitaria' },
    ],
    color: '#9333ea',
  },
  {
    id: 3,
    driver: 'Andrés P.',
    rating: 4.5,
    avatar: 'AP',
    time: '7:30 AM',
    seats: 1,
    waypoints: [
      { lat: 4.5981, lng: -74.1317, label: 'Kennedy' },
      { lat: 4.6156, lng: -74.1021, label: 'Fontibón' },
      { lat: 4.6356, lng: -74.0837, label: 'Ciudad Universitaria' },
    ],
    color: '#ea580c',
  },
]

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function routePassesNear(route, lat, lng, radiusKm = 1.5) {
  return route.waypoints.some((wp) => haversine(wp.lat, wp.lng, lat, lng) <= radiusKm)
}

function SearchInput({ label, value, onChange, onSelect, placeholder }) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  const handleChange = (e) => {
    const q = e.target.value
    onChange(q)
    clearTimeout(timerRef.current)
    if (q.length < 3) { setResults([]); setOpen(false); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const data = await geocode(q)
      setResults(data)
      setOpen(true)
      setLoading(false)
    }, 500)
  }

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={handleChange}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 pr-8 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20 bg-white text-slate-800 placeholder-slate-400 transition-all"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg className="w-3.5 h-3.5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-[2000] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {results.slice(0, 4).map((r) => (
            <button
              key={r.place_id}
              onMouseDown={() => {
                onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name.split(',').slice(0, 2).join(', ') })
                onChange(r.display_name.split(',').slice(0, 2).join(', '))
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
            >
              <span className="font-medium">{r.display_name.split(',')[0]}</span>
              <span className="text-slate-400 ml-1">{r.display_name.split(',').slice(1, 3).join(',')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PassengerRouteMap({ onSelectRoute }) {
  const mapRef     = useRef(null)
  const leafletMap = useRef(null)
  const layersRef  = useRef([])
  const [L, setL]  = useState(null)

  const [originText, setOriginText]   = useState('')
  const [destText, setDestText]       = useState('')
  const [originPt, setOriginPt]       = useState(null)
  const [destPt, setDestPt]           = useState(null)
  const [matchedRoutes, setMatchedRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [searched, setSearched]       = useState(false)

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
    const map = L.map(mapRef.current, { center: [4.711, -74.0721], zoom: 12 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    leafletMap.current = map
    return () => { map.remove(); leafletMap.current = null }
  }, [L])

  useEffect(() => {
    if (!L || !leafletMap.current) return
    const map = leafletMap.current
    layersRef.current.forEach((l) => map.removeLayer(l))
    layersRef.current = []

    const bounds = []

    matchedRoutes.forEach((route) => {
      const isSelected = selectedRoute?.id === route.id
      const coords = route.waypoints.map((w) => [w.lat, w.lng])
      const line = L.polyline(coords, {
        color: route.color,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.5,
        dashArray: isSelected ? null : '8 6',
      }).addTo(map)
      line.bindPopup(`<b>${route.driver}</b><br>Salida: ${route.time}`)
      layersRef.current.push(line)
      coords.forEach((c) => bounds.push(c))

      route.waypoints.forEach((wp) => {
        const circle = L.circleMarker([wp.lat, wp.lng], {
          radius: isSelected ? 7 : 5,
          fillColor: route.color,
          color: 'white',
          weight: 2,
          fillOpacity: 1,
        }).addTo(map).bindPopup(wp.label)
        layersRef.current.push(circle)
      })
    })

    if (originPt) {
      const icon = makePin(L, '#16a34a', 'A')
      const m = L.marker([originPt.lat, originPt.lng], { icon }).addTo(map).bindPopup('Tu origen')
      layersRef.current.push(m)
      bounds.push([originPt.lat, originPt.lng])
    }

    if (destPt) {
      const icon = makePin(L, '#dc2626', 'B')
      const m = L.marker([destPt.lat, destPt.lng], { icon }).addTo(map).bindPopup('Tu destino')
      layersRef.current.push(m)
      bounds.push([destPt.lat, destPt.lng])
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] })
    }
  }, [L, matchedRoutes, selectedRoute, originPt, destPt])

  function makePin(Leaflet, color, letter) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
      <text x="16" y="21" text-anchor="middle" font-size="11" font-weight="bold" fill="${color}">${letter}</text>
    </svg>`
    return Leaflet.divIcon({ html: svg, className: '', iconSize: [32, 42], iconAnchor: [16, 42] })
  }

  function handleSearch() {
    if (!originPt || !destPt) return
    const matched = MOCK_ROUTES.filter(
      (r) => routePassesNear(r, originPt.lat, originPt.lng) && routePassesNear(r, destPt.lat, destPt.lng)
    )
    setMatchedRoutes(matched)
    setSelectedRoute(null)
    setSearched(true)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="bg-white border border-slate-100 rounded-xl p-4">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <SearchInput
            label="Tu origen"
            value={originText}
            onChange={setOriginText}
            onSelect={(pt) => setOriginPt(pt)}
            placeholder="Ej: Chapinero, Bogotá"
          />
          <SearchInput
            label="Tu destino"
            value={destText}
            onChange={setDestText}
            onSelect={(pt) => setDestPt(pt)}
            placeholder="Ej: Ciudad Universitaria"
          />
          <button
            onClick={handleSearch}
            disabled={!originPt || !destPt}
            className="px-5 py-2.5 bg-[#1a3a5c] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7c] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Buscar rutas
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-200 min-h-[420px]">
          <div ref={mapRef} className="absolute inset-0" />
        </div>

        <div className="w-64 flex flex-col gap-3 flex-shrink-0 overflow-auto">
          {!searched && (
            <div className="bg-white border border-slate-100 rounded-xl p-6 text-center">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                </svg>
              </div>
              <p className="text-xs text-slate-400">Ingresa tu origen y destino para ver rutas disponibles</p>
            </div>
          )}

          {searched && matchedRoutes.length === 0 && (
            <div className="bg-white border border-slate-100 rounded-xl p-6 text-center">
              <p className="text-sm font-medium text-slate-700 mb-1">Sin resultados</p>
              <p className="text-xs text-slate-400">No hay rutas que pasen cerca de tu trayecto. Intenta con otras ubicaciones.</p>
            </div>
          )}

          {matchedRoutes.map((route) => (
            <div
              key={route.id}
              onClick={() => setSelectedRoute(selectedRoute?.id === route.id ? null : route)}
              className={`bg-white border rounded-xl p-4 cursor-pointer transition-all duration-150
                ${selectedRoute?.id === route.id ? 'border-[#1a3a5c] ring-2 ring-[#1a3a5c]/20' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ background: route.color }}
                >
                  {route.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{route.driver}</p>
                  <p className="text-[11px] text-slate-400">★ {route.rating} · {route.time}</p>
                </div>
              </div>
              <div className="space-y-1.5 mb-3">
                {route.waypoints.map((wp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: route.color }} />
                    <p className="text-xs text-slate-600 truncate">{wp.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {route.seats} cupo{route.seats !== 1 ? 's' : ''} libre{route.seats !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectRoute?.(route) }}
                  className="text-xs text-[#1a3a5c] font-medium hover:underline"
                >
                  Solicitar →
                </button>
              </div>
            </div>
          ))}

          {searched && matchedRoutes.length > 0 && (
            <p className="text-[10px] text-slate-400 text-center">
              {matchedRoutes.length} ruta{matchedRoutes.length !== 1 ? 's' : ''} compatible{matchedRoutes.length !== 1 ? 's' : ''} encontrada{matchedRoutes.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
