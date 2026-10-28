import DeviceStatus from '../components/DeviceStatus';

export default function HelmetStatus({ sensorData }) {
  const { devices, battery, timestamp } = sensorData;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-bold">Helmet Status</h2>
        <p className="text-slate-500 text-sm">Hardware component status · ESP32 system health</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DeviceStatus devices={devices} battery={battery} lastReceived="2 seconds ago" />
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Hardware Specifications</h3>
          <div className="space-y-2.5">
            {[
              { label: 'MCU', value: 'ESP32 Dev Module (38-pin, 240MHz)' },
              { label: 'GNSS Module', value: 'Quectel L86-M33 (Multi-GNSS)' },
              { label: 'Display', value: '1.3" SH1106 OLED (128×64 @ 0x3C)' },
              { label: 'Motion IMU', value: 'MPU6050 / MPU6500 (6-DOF)' },
              { label: 'Gas Sensor', value: 'MQ-3 Alcohol Sensor' },
              { label: 'RFID Reader', value: 'MFRC522 13.56 MHz SPI' },
              { label: 'Connectivity', value: 'Wi-Fi 802.11 b/g/n' },
              { label: 'Protocol', value: 'HTTP REST + Socket.IO (Port 5000)' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-500 text-xs">{label}</span>
                <span className="text-slate-200 text-xs font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
