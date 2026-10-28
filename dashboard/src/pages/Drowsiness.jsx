import { Eye, Camera } from 'lucide-react';
import DrowsinessCard from '../components/DrowsinessCard';
import StatusBadge from '../components/StatusBadge';
import CameraFeed from '../components/CameraFeed';

export default function Drowsiness({ sensorData }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-bold">Drowsiness Detection & Driver Monitoring</h2>
        <p className="text-slate-500 text-sm">Real-time eye tracking, EAR bi-ocular metrics & live vision feed</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DrowsinessCard data={sensorData} />
        <CameraFeed />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-white font-semibold text-sm mb-3">Detection Algorithm Info</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Model', value: 'YOLO + OpenCV' },
            { label: 'Eye Aspect Ratio', value: '0.25 threshold' },
            { label: 'Blink Threshold', value: '< 15/min' },
            { label: 'Closure Duration', value: '> 2 seconds' },
            { label: 'Processing', value: 'Python backend' },
            { label: 'Status', value: 'Prototype' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
              <p className="text-white text-xs font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
