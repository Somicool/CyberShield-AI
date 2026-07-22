import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getMapPoints } from '../api/incidents'

const THREAT_COLORS = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#facc15',
  low: '#34d399',
}

export default function Heatmap() {
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMapPoints()
      .then((data) => setPoints(data.points))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold mb-1">Threat Heatmap</h2>
      <p className="text-sm text-slate-500 mb-6">
        Geolocated by the hosting server's IP address (from DNS lookup during investigation).
        Only URL incidents that have been investigated appear here — run "Investigate" on an
        incident's detail page to add it to the map.
      </p>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : points.length === 0 ? (
        <p className="text-slate-500">
          No geolocated incidents yet. Investigate a URL incident to plot it here.
        </p>
      ) : (
        <div className="rounded-lg overflow-hidden border border-slate-800" style={{ height: 500 }}>
          <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {points.map((p) => (
              <CircleMarker
                key={p.incident_id}
                center={[p.lat, p.lon]}
                radius={8}
                pathOptions={{
                  color: THREAT_COLORS[p.threat_level] || '#94a3b8',
                  fillColor: THREAT_COLORS[p.threat_level] || '#94a3b8',
                  fillOpacity: 0.6,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-medium">{p.city}, {p.country}</p>
                    <p className="truncate max-w-xs">{p.content}</p>
                    <p>Risk: {p.risk_score} ({p.threat_level})</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  )
}
