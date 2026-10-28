import { useState } from 'react';
import { Video, X } from 'lucide-react';

const FILTERS = ['All', 'Emergency', 'Warning', 'Info'];

const severityStyle = {
  Emergency: 'text-red-400 bg-red-500/10 border-red-500/20',
  Warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const statusStyle = {
  Active: 'text-yellow-400',
  Resolved: 'text-green-400',
  Completed: 'text-slate-400',
};

export default function AlertsTable({ alerts = [] }) {
  const [filter, setFilter] = useState('All');
  const [selectedClipUrl, setSelectedClipUrl] = useState(null);

  const filtered = filter === 'All' ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-white font-semibold text-sm">Recent Alerts</h3>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/50">
              {['Time', 'Alert Type', 'Severity', 'Status', 'Location', '10s Clip'].map((h) => (
                <th key={h} className="text-left text-slate-500 uppercase tracking-wider pb-2 pr-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtered.map((alert) => (
              <tr key={alert.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="py-2.5 pr-4 text-slate-400 font-mono">{alert.time}</td>
                <td className="py-2.5 pr-4 text-slate-200">{alert.type}</td>
                <td className="py-2.5 pr-4">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${severityStyle[alert.severity]}`}>
                    {alert.severity}
                  </span>
                </td>
                <td className={`py-2.5 pr-4 font-medium ${statusStyle[alert.status]}`}>{alert.status}</td>
                <td className="py-2.5 pr-4 text-slate-500 font-mono">{alert.location}</td>
                <td className="py-2.5">
                  {alert.videoClipUrl ? (
                    <button
                      onClick={() => setSelectedClipUrl(alert.videoClipUrl)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <Video size={13} /> Watch Clip
                    </button>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-600">No alerts found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 10-Second Incident Video Modal */}
      {selectedClipUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between text-white">
              <span className="font-semibold text-sm flex items-center gap-2 text-cyan-400">
                <Video size={16} /> 10-Second Incident Video (Black Box Clip)
              </span>
              <button
                onClick={() => setSelectedClipUrl(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <video
              src={selectedClipUrl}
              controls
              autoPlay
              className="w-full max-h-72 rounded-xl bg-black object-contain border border-slate-800"
            />
            <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
              <span className="truncate font-mono text-[11px] max-w-[280px]">{selectedClipUrl}</span>
              <a
                href={selectedClipUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline font-semibold"
              >
                Open Direct Link ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
