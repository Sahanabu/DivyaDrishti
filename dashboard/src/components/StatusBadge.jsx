const colors = {
  green: 'bg-green-500/10 border-green-500/30 text-green-400',
  yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  red: 'bg-red-500/10 border-red-500/30 text-red-400',
  blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  gray: 'bg-slate-700/40 border-slate-600/40 text-slate-400',
};

export default function StatusBadge({ label, color = 'gray', dot = true }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${color === 'green' ? 'status-dot-green' : color === 'yellow' ? 'status-dot-yellow' : color === 'red' ? 'status-dot-red' : 'bg-blue-400'}`} />}
      {label}
    </span>
  );
}
