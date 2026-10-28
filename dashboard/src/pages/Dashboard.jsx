import { Wind, Activity, Eye, Shield, Gauge, Navigation } from 'lucide-react';
import StatCard from '../components/StatCard';
import HealthChart from '../components/HealthChart';
import DrowsinessCard from '../components/DrowsinessCard';
import EmergencyCard from '../components/EmergencyCard';
import DeviceStatus from '../components/DeviceStatus';
import GPSCard from '../components/GPSCard';
import SafetyScoreCard from '../components/SafetyScoreCard';
import AlertsTable from '../components/AlertsTable';

export default function Dashboard({
  sensorData,
  chartData,
  alerts,
  safetyData,
  onResetScore,
  breadcrumbs,
  onAcknowledge,
  onSyncGps,
  gpsSyncStatus
}) {
  const { mq3 = 0, acceleration = 1.0, pitch = 0, roll = 0, speed = 0, drowsinessLevel, helmetStatus, emergency, gps, battery, devices, timestamp } = sensorData;

  const formatLastReceived = () => {
    if (!timestamp) return 'Just now';
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white text-xl font-bold">Dashboard Overview</h2>
        <p className="text-slate-500 text-sm">Real-time AIoT smart helmet telemetry · Live hardware sensor readings</p>
      </div>

      {/* Real Hardware Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wind}
          label="MQ-3 Gas / Alcohol"
          value={mq3}
          unit="ADC"
          status={mq3 > 400 ? 'ALCOHOL' : 'CLEAN'}
          statusColor={mq3 > 400 ? 'red' : 'green'}
          trend={mq3 > 400 ? '⚠ Alcohol Detected' : 'Air quality safe'}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <StatCard
          icon={Activity}
          label="Motion & G-Force"
          value={typeof acceleration === 'number' ? acceleration.toFixed(2) : '1.00'}
          unit="G"
          status={acceleration > 2.5 ? 'HIGH G' : 'NORMAL'}
          statusColor={acceleration > 2.5 ? 'red' : 'green'}
          trend={`P:${Math.round(pitch)}° R:${Math.round(roll)}°`}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          icon={Gauge}
          label="Speed Dynamics"
          value={typeof speed === 'number' ? speed.toFixed(1) : '0.0'}
          unit="km/h"
          status={speed > 60 ? 'HIGH' : 'SAFE'}
          statusColor={speed > 60 ? 'yellow' : 'green'}
          trend={gps?.locationStatus === 'RESOLVED' ? 'GPS Locked' : 'Location Active'}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          icon={Eye}
          label="Drowsiness & Risk"
          value={drowsinessLevel || 'LOW'}
          status={drowsinessLevel === 'HIGH' ? 'ALERT' : 'SAFE'}
          statusColor={drowsinessLevel === 'HIGH' ? 'red' : 'green'}
          trend={emergency ? 'Crash Alert' : (helmetStatus || 'Active')}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
        />
      </div>

      {/* Safety Score & GPS Cockpit Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SafetyScoreCard safetyData={safetyData} onResetScore={onResetScore} />
        <GPSCard gps={gps} onSyncGps={onSyncGps} gpsSyncStatus={gpsSyncStatus} breadcrumbs={breadcrumbs} />
      </div>

      {/* Dynamic Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HealthChart data={chartData} type="motion" />
        <HealthChart data={chartData} type="gas" />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DrowsinessCard data={sensorData} />
        <EmergencyCard data={sensorData} onAcknowledge={onAcknowledge} />
      </div>

      {/* Device Status */}
      <DeviceStatus devices={devices} battery={battery} lastReceived={formatLastReceived()} />

      {/* Alerts */}
      <AlertsTable alerts={alerts} />
    </div>
  );
}
