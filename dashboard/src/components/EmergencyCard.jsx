import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function EmergencyCard({ data, onAcknowledge }) {
  const { emergency, timestamp, gps } = data;

  return (
    <div className={`glass-card p-5 transition-all duration-300 ${emergency ? 'border-red-500/50' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">Emergency Monitoring</h3>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
          emergency
            ? 'bg-red-500/15 border-red-500/40 text-red-400'
            : 'bg-green-500/10 border-green-500/30 text-green-400'
        }`}>
          {emergency ? '⚠ EMERGENCY DETECTED' : '✓ SAFE'}
        </span>
      </div>

      {emergency ? (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 font-semibold text-sm mb-1">Emergency Alert Triggered</p>
            <p className="text-slate-400 text-xs">Time: {new Date(timestamp).toLocaleTimeString()}</p>
            {gps && <p className="text-slate-400 text-xs">Location: {gps.latitude}, {gps.longitude}</p>}
          </div>
          <button
            onClick={onAcknowledge}
            className="w-full py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors"
          >
            Acknowledge Alert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Accident Detection', value: emergency ? 'IMPACT DETECTED' : 'No Incident' },
            { label: 'Crash Guard', value: 'ARMED (25G)' },
            { label: 'SOS Alert', value: 'ARMED' },
            { label: 'Last Check', value: timestamp ? new Date(timestamp).toLocaleTimeString() : 'Active' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
              <p className="text-white text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
