import { useState, useEffect } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { useAI } from '../hooks/useAI';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically update map center
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// ─── Helper Components ──────────────────────────────────────────────

const StatusDot = ({ color }) => (
  <span
    className="inline-block w-2 h-2 rounded-full animate-pulse-dot"
    style={{ backgroundColor: color }}
  />
);

const Card = ({ title, children, className = '' }) => (
  <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 ${className}`}>
    {title && (
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
        {title}
      </h3>
    )}
    {children}
  </div>
);

const Stat = ({ label, value, unit, color }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
    <span className="text-lg font-semibold tabular-nums" style={color ? { color } : {}}>
      {value}
      {unit && <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">{unit}</span>}
    </span>
  </div>
);

// ─── Risk Color Map ─────────────────────────────────────────────────

const RISK_CONFIG = {
  LOW:      { color: 'var(--color-green)',  bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  label: 'LOW' },
  MEDIUM:   { color: 'var(--color-yellow)', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.3)',  label: 'MEDIUM' },
  HIGH:     { color: 'var(--color-orange)', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', label: 'HIGH' },
  CRITICAL: { color: 'var(--color-red)',    bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  label: 'CRITICAL' },
};

// ─── Main Dashboard ─────────────────────────────────────────────────

const Dashboard = () => {
  const realTelemetry = useTelemetry();
  const realAi = useAI();
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [simTelemetry, setSimTelemetry] = useState({
    speed: 60, mq3Value: 120, latitude: 28.6139, longitude: 77.2090, pitch: 0, roll: 0, accelMagnitude: 9.8, gyroMagnitude: 0
  });
  const [simAi, setSimAi] = useState({
    event: 'NORMAL', risk: 'LOW', confidence: 0.95, objects: 2, drowsiness: 'NORMAL'
  });

  const [time, setTime] = useState(new Date());
  const [cameraError, setCameraError] = useState(false);
  const [gpsSyncStatus, setGpsSyncStatus] = useState('');

  const handleSyncPhoneLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGpsSyncStatus('Syncing...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        fetch('http://localhost:5000/api/location/device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude, accuracy })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setGpsSyncStatus(`Synced (${data.place})`);
            setTimeout(() => setGpsSyncStatus(''), 4000);
          } else {
            setGpsSyncStatus('Sync Failed');
          }
        })
        .catch(() => setGpsSyncStatus('Failed'));
      },
      (err) => {
        alert('Could not retrieve location: ' + err.message);
        setGpsSyncStatus('');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSimulateCrash = () => {
    // Capture the speed and location right BEFORE we drop speed to 0
    const impactSpeed = isSimulating ? simTelemetry.speed : realTelemetry.speed;
    const lat = (isSimulating ? simTelemetry.latitude : realTelemetry.latitude) || 28.6139;
    const lng = (isSimulating ? simTelemetry.longitude : realTelemetry.longitude) || 77.2090;

    setIsSimulating(true);
    setSimAi({
      event: 'IMPACT CRASH',
      risk: 'CRITICAL',
      drowsiness: 'NORMAL',
      confidence: 0.99,
      objects: 1
    });
    setSimTelemetry(prev => ({
      ...prev,
      speed: 0,
      accelMagnitude: 25.5,
      pitch: 80,
      roll: -45,
      gyroMagnitude: 150
    }));

    // 1. Trigger Native Browser Notification to simulate the family receiving the message on their device
    if ('Notification' in window) {
      const sendNotification = () => {
        new Notification('🚨 DIVYADRISHTI CRASH ALERT 🚨', {
          body: `Rider crashed!\nGPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}\nSpeed before impact: ${Math.round(impactSpeed)} km/h.\nLocation maps link sent to emergency contacts.`,
        });
      };
      if (Notification.permission === 'granted') {
        sendNotification();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') sendNotification();
        });
      }
    }

    // 2. Trigger the backend to actually send the SMS/Push Notification
    fetch('http://localhost:5000/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telemetry: {
          latitude: lat,
          longitude: lng,
          speed: Math.round(impactSpeed),
          acceleration: 25.5,
          placeName: 'Simulated Crash Site'
        },
        aiState: { event: 'IMPACT CRASH', risk: 'CRITICAL' }
      })
    }).catch(console.error);
  };

  useEffect(() => {
    if (!isSimulating) return;
    
    let simIndex = 0;
    const interval = setInterval(() => {
      simIndex++;
      
      setSimTelemetry(prev => ({
        ...prev,
        latitude: prev.latitude + (Math.random() - 0.2) * 0.0001,
        longitude: prev.longitude + (Math.random() - 0.2) * 0.0001,
        speed: Math.max(0, Math.min(120, prev.speed + (Math.random() - 0.5) * 5)),
        mq3Value: Math.max(0, prev.mq3Value + (Math.random() - 0.5) * 10),
        pitch: (Math.random() - 0.5) * 5,
        roll: (Math.random() - 0.5) * 5,
        accelMagnitude: 9.8 + (Math.random() - 0.5) * 2,
        gyroMagnitude: Math.random() * 5,
      }));

      if (simIndex % 15 === 0) {
        const events = [
          { event: 'DROWSY DRIVER', risk: 'MEDIUM', drowsiness: 'DETECTED' },
          { event: 'LANE DEPARTURE', risk: 'HIGH', drowsiness: 'NORMAL' },
          { event: 'IMPACT CRASH', risk: 'CRITICAL', drowsiness: 'NORMAL' },
          { event: 'NORMAL', risk: 'LOW', drowsiness: 'NORMAL' }
        ];
        const scenario = events[Math.floor(Math.random() * events.length)];
        
        if (scenario.risk === 'CRITICAL') {
          // Fire the alert to the backend so ntfy.sh pushes the notification to the phone!
          fetch('http://localhost:5000/api/emergency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telemetry: {
                latitude: simTelemetry.latitude || 28.6139,
                longitude: simTelemetry.longitude || 77.2090,
                speed: Math.round(simTelemetry.speed),
                acceleration: 12.5,
                placeName: 'Simulated Crash Site'
              },
              aiState: { event: scenario.event, risk: scenario.risk }
            })
          }).catch(console.error);
        }

        setSimAi({
          ...scenario,
          confidence: 0.75 + Math.random() * 0.2,
          objects: Math.floor(Math.random() * 4)
        });
      } else if (simIndex % 15 > 5 && simAi.event !== 'NORMAL') {
        setSimAi(prev => ({ ...prev, event: 'NORMAL', risk: 'LOW', drowsiness: 'NORMAL', confidence: 0.9 + Math.random() * 0.08 }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimulating, simAi.event]);

  const telemetry = isSimulating ? simTelemetry : realTelemetry;
  const ai = isSimulating ? simAi : realAi;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const risk = RISK_CONFIG[ai.risk] || RISK_CONFIG.LOW;
  const isDrowsy = ai.drowsiness === 'DETECTED';
  const isCritical = ai.risk === 'CRITICAL';

  return (
    <div className="w-screen h-screen bg-[var(--color-bg)] flex flex-col overflow-hidden">

      {/* ═══ TOP BAR ═══ */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide">DIVYADRISHTI</h1>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">AI Safety System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Force Crash Button */}
            <button 
              onClick={handleSimulateCrash}
              className="px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all border bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            >
              Force Crash
            </button>

            {/* Sync Phone GPS Button */}
            <button 
              onClick={handleSyncPhoneLocation}
              className="px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all border bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              title="Share phone or browser high-accuracy GPS with the helmet system for zero-cost indoor assistance"
            >
              {gpsSyncStatus || 'Sync Phone GPS'}
            </button>

            {/* Simulate Demo Button */}
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all border ${
                isSimulating 
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              {isSimulating ? 'Stop Demo' : 'Simulate Demo'}
            </button>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <StatusDot color={isSimulating ? "var(--color-yellow)" : "var(--color-green)"} />
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {isSimulating ? 'SIMULATING' : 'LIVE'}
            </span>
          </div>

          {/* Clock */}
          <span className="text-sm font-mono tabular-nums text-[var(--color-text-muted)]">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">

        {/* ─── LEFT: Camera + Speed ─── */}
        <div className="flex flex-col gap-3 min-h-0">

          {/* Camera Feed */}
          <div className="flex-1 relative rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] min-h-0">
            {!cameraError ? (
              <img
                src="http://127.0.0.1:8000/video_feed"
                alt="Camera Feed"
                className="w-full h-full object-cover"
                onError={() => setCameraError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--color-border)] flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)]">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">Camera feed unavailable</span>
                <button
                  onClick={() => setCameraError(false)}
                  className="text-[10px] text-[var(--color-accent)] hover:underline uppercase tracking-wider"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Camera overlay badges */}
            {!cameraError && (
              <>
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-medium tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
                    REC
                  </span>
                  <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-medium tracking-wider">
                    USB CAM
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between">
                  <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-mono">
                    Objects: {ai.objects || 0}
                  </span>
                  <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-mono">
                    Conf: {Math.round((ai.confidence || 0) * 100)}%
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Bottom Stats Row */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <Card>
              <Stat label="Speed" value={Math.round(telemetry.speed)} unit="km/h" />
            </Card>
            <Card>
              <Stat label="Accel" value={(telemetry.accelMagnitude / 9.81).toFixed(1)} unit="G" />
            </Card>
            <Card>
              <Stat label="Pitch" value={telemetry.pitch?.toFixed(1) || '0.0'} unit="°" />
            </Card>
            <Card>
              <Stat label="Roll" value={telemetry.roll?.toFixed(1) || '0.0'} unit="°" />
            </Card>
          </div>
        </div>

        {/* ─── RIGHT SIDEBAR ─── */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">

          {/* AI Prediction */}
          <Card
            title="AI Prediction"
            className={isCritical ? 'glow-danger border-red-500/50' : ''}
          >
            <div className="flex flex-col gap-3">
              {/* Risk Badge */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ backgroundColor: risk.bg, border: `1px solid ${risk.border}` }}
              >
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: risk.color }}>
                  {risk.label} Risk
                </span>
                <span className="text-[10px] font-mono" style={{ color: risk.color }}>
                  {Math.round((ai.confidence || 0) * 100)}%
                </span>
              </div>

              {/* Event */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Event</span>
                <span className="text-sm font-semibold">{ai.event || 'NORMAL'}</span>
              </div>
            </div>
          </Card>

          {/* Driver Status */}
          <Card title="Driver Status">
            <div className="flex flex-col gap-3">
              {/* Drowsiness */}
              <div
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                  isDrowsy
                    ? 'bg-red-500/10 border border-red-500/30'
                    : 'bg-green-500/10 border border-green-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isDrowsy ? 'text-red-400' : 'text-green-400'}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span className="text-xs font-medium uppercase tracking-wider">
                    {isDrowsy ? 'Drowsy' : 'Alert'}
                  </span>
                </div>
                <StatusDot color={isDrowsy ? 'var(--color-red)' : 'var(--color-green)'} />
              </div>

              {/* MQ3 Alcohol Sensor */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">MQ3 Sensor</span>
                <span className={`text-sm font-semibold ${telemetry.mq3Value > 400 ? 'text-red-400' : 'text-green-400'}`}>
                  {telemetry.mq3Value || 0}
                </span>
              </div>
            </div>
          </Card>

          {/* ESP32 Sensors */}
          <Card title="ESP32 Sensors">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Gyro" value={(telemetry.gyroMagnitude || 0).toFixed(1)} unit="°/s" />
              <Stat label="Accel" value={(telemetry.accelMagnitude / 9.81).toFixed(2)} unit="G" />
              <Stat label="Latitude" value={(telemetry.latitude || 0).toFixed(4)} />
              <Stat label="Longitude" value={(telemetry.longitude || 0).toFixed(4)} />
            </div>
            {telemetry.placeName && (
              <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <span>📍</span>
                <span className="truncate text-slate-200 font-medium">{telemetry.placeName}</span>
                {telemetry.locationStatus === 'APPROXIMATE' && (
                  <span className="text-[10px] text-amber-400 font-mono px-1 rounded bg-amber-400/10 ml-auto">APPROX</span>
                )}
              </div>
            )}
          </Card>

          {/* Live GPS Map */}
          <Card className="flex-1 overflow-hidden p-0 relative min-h-[200px] !bg-transparent border-none">
            <div className="absolute top-3 left-3 z-[400] pointer-events-none flex items-center gap-2">
              <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full text-[10px] font-medium tracking-wider flex items-center gap-1.5 shadow-lg">
                <span className={`w-1.5 h-1.5 rounded-full ${telemetry.locationStatus === 'APPROXIMATE' ? 'bg-amber-400' : 'bg-cyan-500'} animate-pulse-dot`} />
                {telemetry.locationStatus === 'APPROXIMATE' ? 'LOCATION (APPROX)' : 'LIVE GPS'}
              </span>
              {telemetry.placeName && (
                <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full text-[10px] font-medium tracking-wider text-slate-200 shadow-lg truncate max-w-[220px]">
                  📍 {telemetry.placeName}
                </span>
              )}
            </div>
            <div className="w-full h-full rounded-xl overflow-hidden border border-[var(--color-border)] relative z-0">
              <MapContainer
                center={[telemetry.latitude || 28.6139, telemetry.longitude || 77.2090]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {telemetry.latitude && telemetry.longitude && (
                  <>
                    <Marker position={[telemetry.latitude, telemetry.longitude]}>
                      <Popup className="text-slate-900 font-sans">
                        <b>Driver Location</b><br/>
                        {telemetry.placeName && (
                          <div className="text-xs text-slate-600 font-medium my-0.5">
                            📍 {telemetry.placeName}
                          </div>
                        )}
                        Speed: {Math.round(telemetry.speed)} km/h
                      </Popup>
                    </Marker>
                    <MapUpdater center={[telemetry.latitude, telemetry.longitude]} />
                  </>
                )}
              </MapContainer>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
