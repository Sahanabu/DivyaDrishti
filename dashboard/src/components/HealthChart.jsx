import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function HealthChart({ data, type = 'motion' }) {
  const isGas = type === 'gas' || type === 'mq3';
  const isSpeed = type === 'speed';
  const isMotion = !isGas && !isSpeed;

  let title = 'Motion & Impact Dynamics';
  let subtitle = 'Real-time MPU6050 Acceleration (G)';
  let dataKey = 'acceleration';
  let unitName = 'G-Force';
  let strokeColor = '#3b82f6';
  let domain = [0, 4];

  if (isGas) {
    title = 'MQ-3 Gas / Alcohol Level';
    subtitle = 'Real-time MQ-3 ADC level';
    dataKey = 'mq3';
    unitName = 'ADC';
    strokeColor = '#f59e0b';
    domain = [0, 1024];
  } else if (isSpeed) {
    title = 'Vehicle Speed';
    subtitle = 'Quectel GNSS Speed (km/h)';
    dataKey = 'speed';
    unitName = 'km/h';
    strokeColor = '#10b981';
    domain = [0, 100];
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <p className="text-slate-500 text-xs">{subtitle} · Live</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-green-400">
          <span className="w-1.5 h-1.5 rounded-full status-dot-green animate-pulse" />
          LIVE
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={domain}
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={unitName}
            stroke={strokeColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: strokeColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
