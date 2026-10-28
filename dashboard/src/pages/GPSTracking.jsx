import GPSCard from '../components/GPSCard';
import { Route, MapPin, Gauge } from 'lucide-react';

export default function GPSTracking({ sensorData, onSyncGps, gpsSyncStatus, breadcrumbs = [] }) {
  const waypoints = Array.isArray(breadcrumbs) ? breadcrumbs.length : 0;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-white text-xl font-bold">GPS Tracking & Live Route</h2>
          <p className="text-slate-500 text-sm">Real-time multi-source location from ESP32 & Quectel L86-M33</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            {waypoints} Route Breadcrumbs Logged
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GPSCard gps={sensorData.gps} onSyncGps={onSyncGps} gpsSyncStatus={gpsSyncStatus} breadcrumbs={breadcrumbs} />
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold text-sm mb-3">GNSS Module Details & Navigation</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Module', value: 'Quectel L86-M33 GNSS' },
              { label: 'Constellations', value: 'GPS + GLONASS + Galileo (EASY™)' },
              { label: 'Interface', value: 'Hardware UART2 (GPIO 16/17 @ 9600 baud)' },
              { label: 'Update Rate', value: '1 Hz (1000ms)' },
              { label: 'Failover Mode', value: 'Auto multi-source failover' },
              { label: 'Accuracy', value: sensorData.gps?.accuracy || 'High Precision' },
              { label: 'Resolved Place', value: sensorData.gps?.placeName || 'Live' },
              { label: 'Live Breadcrumbs', value: `${waypoints} recorded path points` }
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-500 text-xs">{label}</span>
                <span className="text-slate-200 text-xs font-medium truncate max-w-[200px] text-right">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-emerald-400 text-xs font-medium mb-1">Zero-Cost Location Assist</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              When the Quectel L86 is indoors without satellite visibility, clicking <strong className="text-emerald-300">Sync Phone GPS</strong> in the navbar instantly bridges high-accuracy phone coordinates to the helmet, providing automatic road-level reverse geocoding without paid APIs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
