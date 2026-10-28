import { AlertTriangle, ShieldCheck, PlayCircle } from 'lucide-react';
import EmergencyCard from '../components/EmergencyCard';
import AlertsTable from '../components/AlertsTable';

export default function EmergencyAlerts({ sensorData, alerts, onAcknowledge, onTriggerTestImpact }) {
  const emergencyAlerts = alerts.filter(a => a.severity === 'Emergency');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-white text-xl font-bold">Emergency Crash Alerts & Safeguards</h2>
          <p className="text-slate-400 text-sm">
            Impact collision detection with a 10-second cancellation window before SMS/NTFY dispatch
          </p>
        </div>

        {onTriggerTestImpact && (
          <button
            onClick={() => onTriggerTestImpact({
              latitude: sensorData?.gps?.latitude || 15.4318,
              longitude: sensorData?.gps?.longitude || 75.6586,
              speed: sensorData?.speed || 42.5,
              acceleration: 4.6,
              placeName: sensorData?.placeName || 'Hubballi - Dharwad Bypass Road'
            })}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs shadow-lg shadow-red-950/50 flex items-center gap-2 cursor-pointer border border-red-400/30"
          >
            <AlertTriangle size={15} />
            Simulate Crash Impact (Test 10s Popup)
          </button>
        )}
      </div>

      <EmergencyCard data={sensorData} onAcknowledge={onAcknowledge} />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Alerts', value: alerts.length, color: 'text-blue-400' },
          { label: 'Emergency', value: emergencyAlerts.length, color: 'text-red-400' },
          { label: 'Active', value: alerts.filter(a => a.status === 'Active').length, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <AlertsTable alerts={alerts} />
    </div>
  );
}
