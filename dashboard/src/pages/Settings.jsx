import { useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { 
  BASE_URL, 
  fetchRfidCards, 
  registerRfidCard, 
  updateRfidCardStatus, 
  deleteRfidCard,
  simulateRfidScan 
} from '../services/api';
import { 
  Trash2, 
  Plus, 
  RefreshCw, 
  Radio, 
  Activity, 
  Shield, 
  Flame, 
  Navigation, 
  Cpu, 
  Bell, 
  PhoneCall, 
  Sliders, 
  CheckCircle, 
  AlertTriangle,
  Key,
  Check
} from 'lucide-react';

export default function Settings({ 
  sensorData = {}, 
  connected = true, 
  onSyncGps, 
  onTriggerTestImpact, 
  gpsSyncStatus = '' 
}) {
  // Saved Preferences from localStorage or defaults
  const getInitialSettings = () => {
    try {
      const saved = localStorage.getItem('dd_settings');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      deviceId: 'ESP32_HELMET_01',
      riderName: 'Sahana',
      esp32Ip: '192.168.1.100',
      emergencyContact: '+91 98765 43210',
      ntfyTopic: 'divyadrishti_emergency_alerts_demo',
      impactThreshold: 25.0,
      mq3Threshold: 180,
      earThreshold: 0.20,
      autoSyncGps: true,
      alerts: {
        mq3: true,
        drowsiness: true,
        lane: true,
        emergency: true
      }
    };
  };

  const initial = getInitialSettings();

  const [apiUrl, setApiUrl] = useState(BASE_URL);
  const [deviceId, setDeviceId] = useState(initial.deviceId);
  const [riderName, setRiderName] = useState(initial.riderName);
  const [esp32Ip, setEsp32Ip] = useState(initial.esp32Ip);
  const [emergencyContact, setEmergencyContact] = useState(initial.emergencyContact);
  const [ntfyTopic, setNtfyTopic] = useState(initial.ntfyTopic);
  const [impactThreshold, setImpactThreshold] = useState(initial.impactThreshold);
  const [mq3Threshold, setMq3Threshold] = useState(initial.mq3Threshold);
  const [earThreshold, setEarThreshold] = useState(initial.earThreshold);
  const [autoSyncGps, setAutoSyncGps] = useState(initial.autoSyncGps);
  const [alerts, setAlerts] = useState(initial.alerts);
  const [saved, setSaved] = useState(false);

  // RFID Admin State
  const [rfidCards, setRfidCards] = useState([]);
  const [registering, setRegistering] = useState(false);
  const [newCardUid, setNewCardUid] = useState('');
  const [newCardName, setNewCardName] = useState('');
  const [newCardRole, setNewCardRole] = useState('Owner / Rider');
  const [newCardStatus, setNewCardStatus] = useState('active');
  const [loadingCards, setLoadingCards] = useState(false);
  const [rfidMessage, setRfidMessage] = useState(null);
  const [lastScannedEvent, setLastScannedEvent] = useState(null);

  const loadCards = async () => {
    setLoadingCards(true);
    try {
      const cards = await fetchRfidCards();
      setRfidCards(cards);
    } catch (e) {
      console.error('Failed to load RFID cards:', e);
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    loadCards();

    // Listen to real-time RFID scan and update events over Socket.IO
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleRfidScanned = (data) => {
      setLastScannedEvent(data);
      const incomingUid = (data.uid || data.rfid || '').toUpperCase();
      if (incomingUid) {
        setNewCardUid(incomingUid);
        setRfidMessage({ type: 'info', text: `Captured card scan: ${incomingUid}` });
        setTimeout(() => setRfidMessage(null), 4000);
      }
    };

    const handleCardsUpdated = () => {
      loadCards();
    };

    socket.on('rfid_scanned', handleRfidScanned);
    socket.on('rfid_authenticated', handleRfidScanned);
    socket.on('rfid_cards_updated', handleCardsUpdated);

    return () => {
      socket.off('rfid_scanned', handleRfidScanned);
      socket.off('rfid_authenticated', handleRfidScanned);
      socket.off('rfid_cards_updated', handleCardsUpdated);
    };
  }, []);

  const save = () => {
    const payload = {
      deviceId,
      riderName,
      esp32Ip,
      emergencyContact,
      ntfyTopic,
      impactThreshold,
      mq3Threshold,
      earThreshold,
      autoSyncGps,
      alerts
    };
    localStorage.setItem('dd_settings', JSON.stringify(payload));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // RFID Registration Flow
  const startRegistering = () => {
    setRegistering(true);
    setNewCardUid('');
    setNewCardName('');
    setNewCardRole('Rider');
    setNewCardStatus('active');
  };

  const handleGenerateUid = () => {
    const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
    const generated = `${randomHex()} ${randomHex()} ${randomHex()} ${randomHex()}`;
    setNewCardUid(generated);
    setRfidMessage({ type: 'info', text: `Generated sample UID: ${generated}` });
    setTimeout(() => setRfidMessage(null), 3000);
  };

  const handleRegisterCard = async (e) => {
    if (e) e.preventDefault();
    if (!newCardUid || !newCardName) {
      alert('Please enter both Card UID and User Name.');
      return;
    }

    try {
      await registerRfidCard({
        uid: newCardUid.trim().toUpperCase(),
        name: newCardName.trim(),
        role: newCardRole,
        status: newCardStatus
      });

      setRfidMessage({ type: 'success', text: `Card "${newCardName}" registered successfully!` });
      setTimeout(() => setRfidMessage(null), 4000);

      setRegistering(false);
      setNewCardUid('');
      setNewCardName('');
      await loadCards();
    } catch (e) {
      alert(e.message || 'Failed to register card');
    }
  };

  const toggleCardStatus = async (uid, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    // Optimistic UI update
    setRfidCards((prev) =>
      prev.map((c) => (c.uid === uid ? { ...c, status: newStatus } : c))
    );

    try {
      await updateRfidCardStatus(uid, newStatus);
      setRfidMessage({ type: 'success', text: `Card ${uid} set to ${newStatus.toUpperCase()}` });
      setTimeout(() => setRfidMessage(null), 3000);
    } catch (e) {
      console.error(e);
      loadCards();
    }
  };

  const removeCard = async (uid) => {
    if (!confirm(`Are you sure you want to remove card ${uid}?`)) return;
    // Optimistic UI update
    setRfidCards((prev) => prev.filter((c) => c.uid !== uid));

    try {
      await deleteRfidCard(uid);
      setRfidMessage({ type: 'success', text: `Card ${uid} deleted successfully.` });
      setTimeout(() => setRfidMessage(null), 3000);
    } catch (e) {
      console.error(e);
      loadCards();
    }
  };

  const handleTestScan = async (uid) => {
    try {
      await simulateRfidScan(uid);
      // Trigger authentication check against backend auth endpoint
      const res = await fetch(`${BASE_URL}/auth/rfid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid: uid, deviceId })
      });
      const data = await res.json();
      if (res.ok) {
        setRfidMessage({ type: 'success', text: `✓ Tap Verified! Access Granted for ${data.rider || 'Rider'}` });
      } else {
        setRfidMessage({ type: 'error', text: `✕ Access Denied: ${data.error || 'Unauthorized card'}` });
      }
      setTimeout(() => setRfidMessage(null), 4000);
      loadCards();
    } catch (err) {
      setRfidMessage({ type: 'error', text: 'Scan test failed: ' + err.message });
      setTimeout(() => setRfidMessage(null), 4000);
    }
  };

  const handleTriggerImpact = () => {
    if (onTriggerTestImpact) {
      onTriggerTestImpact({
        acceleration: 4.85,
        speed: 42.0,
        placeName: sensorData?.gps?.placeName || 'Hubballi - Dharwad Bypass Road'
      });
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Sliders size={20} className="text-blue-400" />
            Real-Time System & Hardware Settings
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Configure dynamic thresholds, emergency dispatch channels, phone GPS auto-sync, and RFID credentials.
          </p>
        </div>

        <button
          onClick={save}
          className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
            saved
              ? 'bg-emerald-600 text-white shadow-emerald-950/40'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/40'
          }`}
        >
          {saved ? (
            <>
              <CheckCircle size={14} /> Saved Successfully
            </>
          ) : (
            <>
              <Shield size={14} /> Save Changes
            </>
          )}
        </button>
      </div>

      {/* SECTION 1: LIVE HARDWARE & CONNECTIVITY STATUS */}
      <div className="glass-card p-5 border border-slate-800">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Activity size={16} className="text-emerald-400" />
          Live Hardware Link & Telemetry Stream
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* ESP32 Status */}
          <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Cpu size={12} className="text-indigo-400" /> ESP32 Link
              </span>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <p className="text-sm font-bold text-white font-mono">
              {connected ? 'ONLINE' : 'OFFLINE'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Port 5000 WebSocket</p>
          </div>

          {/* Live Phone GPS Sync */}
          <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Navigation size={12} className="text-emerald-400" /> Phone GPS
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-sm font-bold text-emerald-400 font-mono truncate">
              {gpsSyncStatus || '● Live Stream'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              {sensorData?.gps?.latitude ? `${sensorData.gps.latitude.toFixed(4)}, ${sensorData.gps.longitude.toFixed(4)}` : 'Auto-Syncing'}
            </p>
          </div>

          {/* Current G-Force Accel */}
          <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Flame size={12} className="text-amber-400" /> G-Force Accel
              </span>
              <span className="text-[10px] font-mono text-slate-400">MPU6050</span>
            </div>
            <p className="text-sm font-bold text-white font-mono">
              {typeof sensorData?.acceleration === 'number' ? sensorData.acceleration.toFixed(2) : '1.00'} G
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Threshold: {impactThreshold} G</p>
          </div>

          {/* Current MQ-3 Alcohol */}
          <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Activity size={12} className="text-cyan-400" /> Alcohol Level
              </span>
              <span className="text-[10px] font-mono text-slate-400">MQ-3</span>
            </div>
            <p className="text-sm font-bold text-white font-mono">
              {sensorData?.mq3 ?? 0} ppm
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Limit: {mq3Threshold} ppm</p>
          </div>
        </div>

        {/* Global Test Impact Button */}
        <div className="mt-4 p-3 bg-red-950/30 border border-red-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
              <Flame size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Emergency Impact Verification</p>
              <p className="text-[11px] text-slate-400">
                Trigger the 10-second crash countdown modal to verify real-time popup & cancellation logic on this page.
              </p>
            </div>
          </div>
          <button
            onClick={handleTriggerImpact}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-all"
          >
            <Flame size={14} /> Test Crash Impact (10s Modal)
          </button>
        </div>
      </div>

      {/* SECTION 2: CALIBRATION THRESHOLDS & AUTO-SYNC GPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dynamic Alert Thresholds */}
        <div className="glass-card p-5 border border-slate-800 space-y-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Sliders size={16} className="text-amber-400" />
            Sensor Calibration Thresholds
          </h3>

          {/* Impact G-Force Slider */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Impact Collision Threshold</span>
              <span className="text-amber-400 font-mono font-bold">{impactThreshold} G</span>
            </div>
            <input
              type="range"
              min="3"
              max="35"
              step="0.5"
              value={impactThreshold}
              onChange={(e) => setImpactThreshold(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <p className="text-[10px] text-slate-500">
              Accelerations above this trigger the 10-second crash emergency window.
            </p>
          </div>

          {/* MQ-3 Alcohol Limit */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">MQ-3 Alcohol Intoxication Limit</span>
              <span className="text-cyan-400 font-mono font-bold">{mq3Threshold} ppm</span>
            </div>
            <input
              type="range"
              min="60"
              max="350"
              step="10"
              value={mq3Threshold}
              onChange={(e) => setMq3Threshold(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <p className="text-[10px] text-slate-500">
              Readings above limit lock vehicle ignition and sound helmet buzzer.
            </p>
          </div>

          {/* Drowsiness EAR Sensitivity */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Bi-Ocular EAR Fatigue Sensitivity</span>
              <span className="text-purple-400 font-mono font-bold">{earThreshold} EAR</span>
            </div>
            <input
              type="range"
              min="0.12"
              max="0.28"
              step="0.01"
              value={earThreshold}
              onChange={(e) => setEarThreshold(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <p className="text-[10px] text-slate-500">
              Eye Aspect Ratio below this for &gt;2 seconds triggers cognitive fatigue alert.
            </p>
          </div>
        </div>

        {/* Location & GPS Auto-Sync */}
        <div className="glass-card p-5 border border-slate-800 space-y-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Navigation size={16} className="text-emerald-400" />
            Live Phone GPS Auto-Sync Settings
          </h3>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Live Phone GPS Bridge</p>
                <p className="text-[11px] text-slate-400">Continuously streams high-accuracy phone coordinates to helmet</p>
              </div>
              <button
                onClick={() => setAutoSyncGps(!autoSyncGps)}
                className={`w-11 h-6 rounded-full transition-colors relative ${autoSyncGps ? 'bg-emerald-500' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSyncGps ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Status: <strong className="text-emerald-300">{gpsSyncStatus || 'Active (±3m)'}</strong>
              </span>
              {onSyncGps && (
                <button
                  onClick={onSyncGps}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition"
                >
                  <RefreshCw size={11} /> Force Sync
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Current Resolved Place</label>
              <input
                readOnly
                value={sensorData?.gps?.placeName || 'Hubballi - Dharwad Bypass Road'}
                className="w-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Safety Window Countdown</label>
              <input
                readOnly
                value="10 Seconds (Fixed Safety Cancellation Interval)"
                className="w-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: EMERGENCY NOTIFICATION CHANNELS & TWILIO */}
      <div className="glass-card p-5 border border-slate-800">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <PhoneCall size={16} className="text-blue-400" />
          Emergency Contacts & SOS Dispatch Channels
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Primary Rider Name</label>
            <input
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Emergency SMS Contact (Twilio)</label>
            <input
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">NTFY.sh Topic Channel</label>
            <input
              value={ntfyTopic}
              onChange={(e) => setNtfyTopic(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Hardware Device ID</label>
            <input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: REAL-TIME NOTIFICATION TOGGLES */}
      <div className="glass-card p-5 border border-slate-800">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Bell size={16} className="text-purple-400" />
          Real-Time Alert Notifications
        </h3>

        <div className="space-y-3">
          {[
            { key: 'mq3', label: 'Alcohol & Intoxication Alarms', desc: 'Notify immediately when MQ-3 exceeds safety limits (>180 ppm)' },
            { key: 'drowsiness', label: 'Drowsiness & Microsleep Alarms', desc: 'Acoustic warnings when bi-ocular eye closure duration > 2.0s' },
            { key: 'lane', label: 'ADAS Right Lane Departure Alerts', desc: 'Warn rider upon un-signaled drift across right boundary line' },
            { key: 'emergency', label: 'Impact Collision & SOS Modal', desc: 'Instantly pop up 10-second safety window on any page upon high deceleration' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
              <div>
                <p className="text-slate-200 text-sm font-medium">{label}</p>
                <p className="text-slate-500 text-xs">{desc}</p>
              </div>
              <button
                onClick={() => setAlerts((a) => ({ ...a, [key]: !a[key] }))}
                className={`w-11 h-6 rounded-full transition-colors relative ${alerts[key] ? 'bg-blue-500' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${alerts[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: REAL RFID ADMINISTRATION (FULLY FUNCTIONAL) */}
      <div className="glass-card p-5 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Radio size={18} className="text-blue-400" />
              RFID Credential Administration
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Authorized smart helmet keys stored in MongoDB. Tap on ESP32 or enter UID manually.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={loadCards} 
              disabled={loadingCards}
              className="text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw size={13} className={loadingCards ? "animate-spin text-blue-400" : ""} /> Reload Cards
            </button>
            {!registering && (
              <button 
                onClick={startRegistering}
                className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg transition shadow-sm shadow-blue-950/40"
              >
                <Plus size={14} /> Add RFID Card
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert Pill */}
        {rfidMessage && (
          <div className={`p-3 mb-4 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in ${
            rfidMessage.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : rfidMessage.type === 'error'
              ? 'bg-red-500/15 border border-red-500/30 text-red-300'
              : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-ping" />
            {rfidMessage.text}
          </div>
        )}

        {/* Registration Modal Form */}
        {registering && (
          <form onSubmit={handleRegisterCard} className="bg-slate-900/90 border border-blue-500/40 rounded-xl p-4 mb-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-blue-400 text-sm font-semibold flex items-center gap-1.5">
                <Plus size={15} /> Register New RFID Credential
              </h4>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                Listening for hardware reader taps...
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card UID Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-slate-300 font-medium">Card UID (Hex)</label>
                  <button
                    type="button"
                    onClick={handleGenerateUid}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline font-mono"
                  >
                    Generate Random UID
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    placeholder="e.g. C9 DA 12 07"
                    value={newCardUid}
                    onChange={(e) => setNewCardUid(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 text-emerald-400 text-xs rounded-lg px-3 py-2 font-mono font-bold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Tap physical card on RC522 reader or type UID directly.
                </p>
              </div>

              {/* User Name */}
              <div className="space-y-1">
                <label className="text-slate-300 text-xs font-medium block">Rider / Owner Name</label>
                <input
                  placeholder="e.g. Sahana (Primary)"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-medium"
                  required
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-slate-300 text-xs font-medium block">Role & Privileges</label>
                <select
                  value={newCardRole}
                  onChange={(e) => setNewCardRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="Owner / Rider">Owner / Rider</option>
                  <option value="Rider">Rider</option>
                  <option value="Admin">Admin</option>
                  <option value="Backup">Backup Tag</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>

              {/* Initial Status */}
              <div className="space-y-1">
                <label className="text-slate-300 text-xs font-medium block">Authorization Status</label>
                <select
                  value={newCardStatus}
                  onChange={(e) => setNewCardStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="active">Active (Granted Access)</option>
                  <option value="inactive">Inactive (Deactivated)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <button 
                type="button"
                onClick={() => setRegistering(false)}
                className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!newCardUid || !newCardName}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition disabled:opacity-50 shadow-sm"
              >
                Save & Register Card
              </button>
            </div>
          </form>
        )}

        {/* Real Dynamic RFID Cards Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="text-[11px] uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Card UID</th>
                <th className="px-4 py-3">User / Rider</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Used</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {rfidCards.map((card) => {
                const isActive = (card.status === 'active' || card.status === 'Active');
                return (
                  <tr key={card.uid} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">
                      <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                        {card.uid}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {card.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded text-[11px]">
                        {card.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleCardStatus(card.uid, card.status)}
                        title="Click to toggle status (Active / Inactive)"
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-all flex items-center gap-1 ${
                          isActive 
                            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                            : 'border-slate-600 text-slate-400 bg-slate-800 hover:bg-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-400">
                      {card.lastUsed ? new Date(card.lastUsed).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleTestScan(card.uid)}
                          title="Simulate scanning this card to verify login authentication"
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition flex items-center gap-1 text-[11px]"
                        >
                          <Key size={12} /> Test Scan
                        </button>
                        <button 
                          onClick={() => removeCard(card.uid)}
                          title="Delete card from database"
                          className="p-1.5 rounded-lg bg-red-500/10 text-slate-400 hover:text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rfidCards.length === 0 && !loadingCards && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    No registered RFID cards found in database. Click <strong>Add RFID Card</strong> to register one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
