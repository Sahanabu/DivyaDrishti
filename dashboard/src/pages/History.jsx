import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { fetchHistory } from '../services/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function History() {
  const [history, setHistory] = useState([]);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchHistory().then(setHistory);
  }, []);

  const filtered = dateFilter
    ? history.filter(h => h.timestamp.startsWith(dateFilter))
    : history;

  const exportCSV = () => {
    const header = 'Timestamp,MQ3_ADC,Acceleration_G,Speed_kmh,Place,LocationStatus,Emergency\n';
    const rows = filtered.map(h =>
      `"${h.timestamp}",${h.mq3},${h.acceleration},${h.speed},"${h.placeName || ''}","${h.locationStatus || ''}",${h.emergency}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'divyadrishti_telemetry_history.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white text-xl font-bold">Telemetry History</h2>
          <p className="text-slate-500 text-sm">Historical smart helmet sensor records stored in MongoDB</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-colors"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Motion & Impact Acceleration (G) History</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={filtered.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="id" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
              <YAxis domain={[0, 4]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="acceleration" name="G-Force" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold text-sm mb-3">MQ-3 Gas / Alcohol ADC History</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={filtered.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="id" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
              <YAxis domain={[0, 1024]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="mq3" name="ADC Level" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-5 overflow-x-auto">
        <h3 className="text-white font-semibold text-sm mb-3">Session Log ({filtered.length} records)</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/50">
              {['Timestamp', 'MQ-3 Gas ADC', 'Motion (G)', 'Speed', 'Location Place', 'Status', 'Emergency'].map(h => (
                <th key={h} className="text-left text-slate-500 uppercase tracking-wider pb-2 pr-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y border-slate-700/30">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  No telemetry logged yet. Helmet will record live records as telemetry arrives.
                </td>
              </tr>
            ) : (
              filtered.map(row => (
                <tr key={row.id} className="hover:bg-slate-700/20">
                  <td className="py-2 pr-4 text-slate-400 font-mono">{new Date(row.timestamp).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-amber-300 font-medium">{row.mq3} ADC</td>
                  <td className="py-2 pr-4 text-blue-300 font-medium">{typeof row.acceleration === 'number' ? row.acceleration.toFixed(2) : row.acceleration}G</td>
                  <td className="py-2 pr-4 text-slate-300">{row.speed} km/h</td>
                  <td className="py-2 pr-4 text-slate-300 max-w-[200px] truncate">{row.placeName || 'Gangavathi'}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.locationStatus === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                      {row.locationStatus || 'RESOLVED'}
                    </span>
                  </td>
                  <td className={`py-2 font-medium ${row.emergency ? 'text-red-400' : 'text-green-400'}`}>
                    {row.emergency ? 'CRASH ALERT' : 'Normal'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
