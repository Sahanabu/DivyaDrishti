import { Eye } from 'lucide-react';
import StatusBadge from './StatusBadge';

const levels = ['SAFE', 'CAUTION', 'DROWSY'];
const levelColors = { LOW: 'green', MEDIUM: 'yellow', HIGH: 'red' };
const levelIndex = { LOW: 0, MEDIUM: 1, HIGH: 2 };

export default function DrowsinessCard({ data }) {
  const { drowsinessLevel = 'LOW', blinkRate = 12, eyeClosure = 'Normal' } = data;
  const idx = levelIndex[drowsinessLevel] ?? 0;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Eye size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Drowsiness Detection</h3>
            <p className="text-slate-500 text-xs">AI Eye Tracking · Prototype readings</p>
          </div>
        </div>
        <StatusBadge label="ACTIVE" color="green" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Blink Rate', value: `${blinkRate}/min` },
          { label: 'Eye Closure', value: eyeClosure },
          { label: 'Level', value: drowsinessLevel },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-white text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Level indicator */}
      <div className="flex gap-2">
        {levels.map((lvl, i) => (
          <div
            key={lvl}
            className={`flex-1 py-2 rounded-lg text-center text-xs font-semibold transition-all ${
              i === idx
                ? i === 0 ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : i === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-slate-800/40 text-slate-600 border border-slate-700/30'
            }`}
          >
            {lvl}
          </div>
        ))}
      </div>
    </div>
  );
}
