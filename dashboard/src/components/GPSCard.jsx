import { useEffect } from 'react';
import { MapPin, ExternalLink, Navigation, Route as RouteIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default icon asset resolution
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
}

export default function GPSCard({ gps, onSyncGps, gpsSyncStatus, breadcrumbs = [] }) {
  const lat = Number.isFinite(parseFloat(gps?.latitude)) ? parseFloat(gps.latitude) : 15.4318;
  const lon = Number.isFinite(parseFloat(gps?.longitude)) ? parseFloat(gps.longitude) : 75.6586;
  const accuracy = gps?.accuracy || '±5m';
  const place = gps?.placeName || 'Location Active';
  const status = gps?.locationStatus || 'RESOLVED';
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
  const center = [lat, lon];

  // Build clean valid coordinates array for polyline
  const rawCrumbs = Array.isArray(breadcrumbs) && breadcrumbs.length > 0
    ? breadcrumbs
    : (Array.isArray(gps?.breadcrumbs) ? gps.breadcrumbs : []);

  const routePositions = rawCrumbs
    .filter(b => b && Number.isFinite(b.latitude) && Number.isFinite(b.longitude) && b.latitude !== 0)
    .map(b => [b.latitude, b.longitude]);

  // Always ensure current position is the head of the breadcrumb trail
  if (routePositions.length === 0 || 
      Math.abs(routePositions[routePositions.length - 1][0] - lat) > 0.00005 || 
      Math.abs(routePositions[routePositions.length - 1][1] - lon) > 0.00005) {
    routePositions.push([lat, lon]);
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <MapPin size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">GPS Tracking & Route</h3>
            <p className="text-slate-500 text-xs truncate max-w-[180px]">{place}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onSyncGps && (
            <button
              onClick={onSyncGps}
              className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all flex items-center gap-1"
            >
              <Navigation size={11} className={gpsSyncStatus ? 'animate-spin' : ''} />
              {gpsSyncStatus || 'Sync GPS'}
            </button>
          )}
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full status-dot-green animate-pulse" />
            {status}
          </span>
        </div>
      </div>

      {/* Real Live Leaflet Map with Breadcrumbs Trail */}
      <div className="w-full h-44 rounded-lg border border-slate-700/50 mb-4 overflow-hidden relative z-0">
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Glowing Polyline Route Trail */}
          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: '#10b981',
                weight: 4,
                opacity: 0.85,
                lineJoin: 'round'
              }}
            />
          )}

          <Marker position={center}>
            <Popup>
              <div className="text-xs">
                <strong>DivyaDrishti Helmet</strong><br />
                {place}<br />
                {lat.toFixed(5)}, {lon.toFixed(5)}<br />
                Route: {routePositions.length} waypoints
              </div>
            </Popup>
          </Marker>
          <MapRecenter center={center} />
        </MapContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {[
          { label: 'Latitude', value: lat.toFixed(6) },
          { label: 'Longitude', value: lon.toFixed(6) },
          { label: 'Accuracy', value: accuracy },
          { label: 'Route Trail', value: `${routePositions.length} points` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800/50 rounded-lg p-2.5">
            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-white text-xs font-mono font-semibold truncate">{value}</p>
          </div>
        ))}
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
      >
        <ExternalLink size={13} /> Open in Google Maps
      </a>
    </div>
  );
}
