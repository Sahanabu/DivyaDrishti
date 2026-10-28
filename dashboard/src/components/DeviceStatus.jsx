import { Cpu, Monitor, MapPin, Wifi, Battery, Clock, Radio, Wind, Activity } from 'lucide-react';

const deviceList = [
  { key: 'esp32', label: 'ESP32 Controller', icon: Cpu },
  { key: 'rfid', label: 'MFRC522 RFID Reader', icon: Radio },
  { key: 'mq3', label: 'MQ-3 Gas / Alcohol', icon: Wind },
  { key: 'oled', label: '1.3" SH1106 OLED', icon: Monitor },
  { key: 'gps', label: 'Quectel L86 GNSS', icon: MapPin },
  { key: 'imu', label: 'MPU6050 Motion IMU', icon: Activity },
  { key: 'wifi', label: 'Wi-Fi Hotspot', icon: Wifi },
];

const statusStyle = {
  online: 'text-green-400',
  connected: 'text-green-400',
  scanning: 'text-blue-400',
  disconnected: 'text-red-400',
  offline: 'text-red-400',
  warning: 'text-yellow-400',
  error: 'text-red-500',
};

const dotStyle = {
  online: 'status-dot-green',
  connected: 'status-dot-green',
  scanning: 'status-dot-blue bg-blue-500 animate-pulse',
  disconnected: 'status-dot-red',
  offline: 'status-dot-red',
  warning: 'status-dot-yellow',
  error: 'status-dot-red',
};

export default function DeviceStatus({ devices, battery, lastReceived }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-white font-semibold text-sm mb-4">Helmet Device Status</h3>
      <div className="space-y-2.5 mb-4">
        {deviceList.map(({ key, label, icon: Icon }) => {
          // Default all to connected for demo purposes except where defined
          const status = devices?.[key] || 'connected';
          return (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
              <div className="flex items-center gap-2.5">
                <Icon size={14} className="text-slate-500" />
                <span className="text-slate-300 text-xs">{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dotStyle[status.toLowerCase()] || 'bg-slate-500'}`} />
                <span className={`text-xs font-medium uppercase ${statusStyle[status.toLowerCase()] || 'text-slate-400'}`}>{status}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Battery size={12} className="text-slate-500" />
            <p className="text-slate-500 text-[10px] uppercase tracking-wider">Battery</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${battery > 50 ? 'bg-green-500' : battery > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${battery}%` }}
              />
            </div>
            <span className="text-white text-xs font-semibold">{battery}%</span>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} className="text-slate-500" />
            <p className="text-slate-500 text-[10px] uppercase tracking-wider">Last Data</p>
          </div>
          <p className="text-white text-xs font-semibold">{lastReceived || 'Just now'}</p>
        </div>
      </div>
    </div>
  );
}
