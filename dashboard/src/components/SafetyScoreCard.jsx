import React from 'react';
import { Award, ShieldAlert, RotateCcw, AlertTriangle, Eye, Car, ArrowRightLeft } from 'lucide-react';

export default function SafetyScoreCard({ safetyData, onResetScore }) {
  const score = typeof safetyData?.score === 'number' ? safetyData.score : 96;
  const grade = safetyData?.grade || (score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : 'C');
  const metrics = safetyData?.metrics || {};

  // Color gradient based on score
  const getScoreColor = (val) => {
    if (val >= 90) return 'text-emerald-400 stroke-emerald-400';
    if (val >= 75) return 'text-blue-400 stroke-blue-400';
    if (val >= 60) return 'text-amber-400 stroke-amber-400';
    return 'text-rose-500 stroke-rose-500';
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Award size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Driver Safety Score</h3>
            <p className="text-slate-500 text-xs">AI & Sensor Fusion Telemetry Benchmark</p>
          </div>
        </div>

        {onResetScore && (
          <button
            onClick={onResetScore}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Reset score to 100 for new session"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-around py-2">
        {/* Circular Progress Gauge */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              className="stroke-slate-800"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              className={`${getScoreColor(score)} transition-all duration-700 ease-out`}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-white font-mono tracking-tight">{score}</span>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">/ 100</span>
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Driver Grade:</span>
            <span className={`text-sm font-extrabold px-2 py-0.5 rounded ${score >= 85 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {grade}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-medium">
            {score >= 90 ? '🌟 Exemplary Rider' : score >= 75 ? '👍 Safe & Attentive' : '⚠️ Moderate Risk Detected'}
          </p>
          <p className="text-[11px] text-slate-500">
            Rewards smooth driving +1 every 15s.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-700/40">
        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center text-purple-400 mb-0.5">
            <Eye size={13} />
          </div>
          <p className="text-[10px] text-slate-400">Drowsy</p>
          <p className="text-xs font-mono font-bold text-white">{metrics.drowsinessEvents || 0}</p>
        </div>

        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center text-rose-400 mb-0.5">
            <Car size={13} />
          </div>
          <p className="text-[10px] text-slate-400">FCW</p>
          <p className="text-xs font-mono font-bold text-white">{metrics.forwardCollisionWarnings || 0}</p>
        </div>

        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center text-amber-400 mb-0.5">
            <ArrowRightLeft size={13} />
          </div>
          <p className="text-[10px] text-slate-400">Lane Drift</p>
          <p className="text-xs font-mono font-bold text-white">{metrics.laneDepartures || 0}</p>
        </div>

        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center text-blue-400 mb-0.5">
            <ShieldAlert size={13} />
          </div>
          <p className="text-[10px] text-slate-400">Hard Brake</p>
          <p className="text-xs font-mono font-bold text-white">{metrics.hardBrakes || 0}</p>
        </div>
      </div>
    </div>
  );
}
