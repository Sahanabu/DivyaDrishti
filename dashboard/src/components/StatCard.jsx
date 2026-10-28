export default function StatCard({ icon: Icon, label, value, unit, status, statusColor, trend, iconColor = 'text-blue-400', iconBg = 'bg-blue-500/10' }) {
  const colorMap = {
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  return (
    <div className="glass-card p-5 hover:border-slate-600/60 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={18} className={iconColor} />
        </div>
        {status && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorMap[statusColor] || colorMap.blue}`}>
            {status}
          </span>
        )}
      </div>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className="text-white text-2xl font-bold">{value}</span>
        {unit && <span className="text-slate-400 text-sm mb-0.5">{unit}</span>}
      </div>
      {trend && <p className="text-slate-500 text-xs mt-1">{trend}</p>}
    </div>
  );
}
