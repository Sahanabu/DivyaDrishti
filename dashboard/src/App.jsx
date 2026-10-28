import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Drowsiness from './pages/Drowsiness';
import EmergencyAlerts from './pages/EmergencyAlerts';
import GPSTracking from './pages/GPSTracking';
import HelmetStatus from './pages/HelmetStatus';
import History from './pages/History';
import Settings from './pages/Settings';
import ImpactModal from './components/ImpactModal';
import { socketService } from './services/socket';
import { BASE_URL, fetchAlerts, syncDeviceLocation, triggerTestImpact, fetchSafetyScore, resetSafetyScore, fetchActiveTrip } from './services/api';
import { voiceAlertService } from './services/voiceAlertService';
import { initialSensorData, initialChartData, generateTimeLabel } from './data/mockData';

const MAX_CHART_POINTS = 30;

function MainApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sensorData, setSensorData] = useState(initialSensorData);
  const [chartData, setChartData] = useState(initialChartData);
  const [alerts, setAlerts] = useState([]);
  const [safetyData, setSafetyData] = useState({ score: 96, grade: 'A+', metrics: {} });
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [connected, setConnected] = useState(true);
  const [esp32Online, setEsp32Online] = useState(false);
  const [gpsSyncStatus, setGpsSyncStatus] = useState('');
  const [pendingEmergency, setPendingEmergency] = useState(null);
  const lastTelemetryPacketRef = useRef(0);

  // 1. Load alerts, safety score, active trip, & check live ESP32 status on mount
  useEffect(() => {
    fetchAlerts().then(setAlerts).catch(() => {});
    fetchSafetyScore().then(setSafetyData).catch(() => {});
    fetchActiveTrip().then((trip) => {
      if (trip && Array.isArray(trip.breadcrumbs)) {
        setBreadcrumbs(trip.breadcrumbs);
      }
    }).catch(() => {});

    fetch(`${BASE_URL}/telemetry/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const isOnline = Boolean(data.online);
          setEsp32Online(isOnline);
          if (isOnline) lastTelemetryPacketRef.current = data.lastSeen || Date.now();
          setSensorData((prev) => ({
            ...prev,
            devices: {
              ...prev.devices,
              esp32: isOnline ? 'online' : 'offline'
            }
          }));
        }
      })
      .catch(() => {});
  }, []);

  // 2. Real-time Socket.IO Connection to backend
  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => {
      console.log('Socket connected to DivyaDrishti Backend');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected from DivyaDrishti Backend');
      setConnected(false);
      setEsp32Online(false);
      setSensorData((prev) => ({
        ...prev,
        devices: {
          ...prev.devices,
          esp32: 'offline'
        }
      }));
    });

    // Hardware connection status from backend
    socket.on('esp32_status', (data) => {
      const isOnline = Boolean(data?.online);
      setEsp32Online(isOnline);
      if (isOnline) {
        lastTelemetryPacketRef.current = data?.lastSeen || Date.now();
      }
      setSensorData((prev) => ({
        ...prev,
        devices: {
          ...prev.devices,
          esp32: isOnline ? 'online' : 'offline'
        }
      }));
    });

    // Live Telemetry Event from ESP32
    socket.on('telemetry_update', (data) => {
      setConnected(true);
      setEsp32Online(true);
      lastTelemetryPacketRef.current = Date.now();
      setSensorData((prev) => {
        const cleanLat = data.latitude || data.gps?.latitude || prev.gps.latitude;
        const cleanLon = data.longitude || data.gps?.longitude || prev.gps.longitude;
        const place = data.placeName || data.place || prev.gps.placeName || '';
        const locStatus = data.locationStatus || prev.gps.locationStatus || 'RESOLVED';
        const speedVal = typeof data.speed === 'number' ? data.speed : prev.speed;
        const isSessionActive = data.sessionActive !== undefined ? data.sessionActive : prev.helmetStatus === 'Active';
        const mq3Val = data.mq3Value ?? data.mq3 ?? prev.mq3;
        const accelVal = typeof data.acceleration === 'number' ? data.acceleration : (typeof data.motion?.magnitude === 'number' ? data.motion.magnitude : prev.acceleration);

        return {
          ...prev,
          speed: speedVal,
          mq3: mq3Val,
          acceleration: accelVal,
          pitch: data.pitch ?? data.motion?.pitch ?? prev.pitch,
          roll: data.roll ?? data.motion?.roll ?? prev.roll,
          helmetStatus: isSessionActive ? 'Active' : 'Standby',
          timestamp: new Date().toISOString(),
          gps: {
            ...prev.gps,
            latitude: cleanLat,
            longitude: cleanLon,
            placeName: place,
            locationStatus: locStatus,
            accuracy: data.accuracy ? `±${Math.round(data.accuracy)}m` : (locStatus === 'APPROXIMATE' ? '±50m' : '±4m'),
            speed: speedVal,
          },
          devices: {
            ...prev.devices,
            esp32: 'online',
            gps: (cleanLat !== 0 && cleanLon !== 0) ? 'connected' : 'searching',
            wifi: 'connected',
            rfid: 'connected',
            oled: 'connected',
            mq3: 'connected',
            imu: 'connected',
          }
        };
      });

      // Update real-time charts with REAL dynamic hardware values
      setChartData((prev) => {
        const accelVal = typeof data.acceleration === 'number' ? Math.round(data.acceleration * 100) / 100 : (typeof data.motion?.magnitude === 'number' ? Math.round(data.motion.magnitude * 100) / 100 : 1.0);
        const mq3Val = data.mq3Value ?? data.mq3 ?? (prev[prev.length - 1]?.mq3 || 0);
        const speedVal = typeof data.speed === 'number' ? Math.round(data.speed * 10) / 10 : 0;

        const next = [
          ...prev,
          {
            time: generateTimeLabel(),
            acceleration: accelVal,
            mq3: mq3Val,
            speed: speedVal
          }
        ];
        return next.length > MAX_CHART_POINTS ? next.slice(-MAX_CHART_POINTS) : next;
      });
    });

    // Safety Score Update Event
    socket.on('safety_score_update', (data) => {
      setSafetyData(data);
    });

    // Breadcrumb Update Event
    socket.on('breadcrumb_update', (data) => {
      if (data.coordinate) {
        setBreadcrumbs((prev) => [...prev, data.coordinate]);
      }
      if (typeof data.safetyScore === 'number') {
        setSafetyData((prev) => ({ ...prev, score: data.safetyScore }));
      }
    });

    // AI Prediction Event
    socket.on('ai_prediction', (data) => {
      setSensorData((prev) => ({
        ...prev,
        drowsiness: data.event || prev.drowsiness,
        drowsinessLevel: (data.risk === 'HIGH' || data.event === 'DROWSY' || String(data.event).includes('UNCONSCIOUS')) ? 'HIGH' : 'LOW',
      }));

      // Speak audible voice ADAS warning
      if (data.event) {
        voiceAlertService.announceEvent(data.event);
      }
      if (typeof data.safetyScore === 'number') {
        setSafetyData((prev) => ({ ...prev, score: data.safetyScore }));
      }
    });

    // Emergency Pending Event (Starts 10-second confirmation window)
    socket.on('emergency_pending', (data) => {
      console.log('🚨 [EMERGENCY PENDING] Impact event detected! Opening 10s modal:', data);
      voiceAlertService.announceEvent('IMPACT');
      setPendingEmergency(data);

      const impactAccel = data.telemetry?.acceleration || 4.85;
      const impactSpeed = data.telemetry?.speed || 0;
      const place = data.telemetry?.placeName || data.place || 'Impact Site';

      setSensorData((prev) => ({
        ...prev,
        emergency: true,
        acceleration: impactAccel,
        speed: impactSpeed,
        timestamp: new Date().toISOString(),
        gps: {
          ...prev.gps,
          latitude: data.telemetry?.latitude || prev.gps.latitude,
          longitude: data.telemetry?.longitude || prev.gps.longitude,
          placeName: place
        }
      }));

      // Push impact spike point into chartData so the chart immediately spikes!
      setChartData((prev) => {
        const next = [
          ...prev,
          {
            time: generateTimeLabel(),
            acceleration: impactAccel,
            mq3: prev[prev.length - 1]?.mq3 || 120,
            speed: impactSpeed
          }
        ];
        return next.length > MAX_CHART_POINTS ? next.slice(-MAX_CHART_POINTS) : next;
      });
    });

    // Emergency Cancelled Event (User pressed Cancel / False alarm)
    socket.on('emergency_cancelled', (data) => {
      console.log('🛡️ [EMERGENCY CANCELLED] Cancelled by user. No message sent:', data);
      setPendingEmergency(null);
      setSensorData((prev) => ({
        ...prev,
        emergency: false,
        acceleration: 1.0,
        speed: 0
      }));
    });

    // Emergency Dispatched Event (10s expired or SOS sent)
    socket.on('emergency_dispatched', (data) => {
      console.log('🚨 [EMERGENCY DISPATCHED] SOS dispatched to contacts:', data);
      setSensorData((prev) => ({
        ...prev,
        emergency: true,
        timestamp: new Date().toISOString()
      }));

      setAlerts((prev) => [
        {
          id: data.id || Date.now(),
          time: new Date().toLocaleTimeString(),
          type: 'Impact Confirmed (SOS Sent)',
          severity: 'Emergency',
          status: 'Active',
          location: data.place || 'Crash Location',
          videoClipUrl: data.videoClipUrl || ''
        },
        ...prev
      ]);
    });

    // Emergency Crash / Impact Event fallback
    socket.on('emergency', (data) => {
      console.log('🚨 [EMERGENCY FALLBACK] Opening 10s modal:', data);
      const fallbackAlert = {
        id: data?.id || Date.now(),
        timestamp: Date.now(),
        countdown: 10,
        telemetry: data?.telemetry || {
          latitude: data?.location?.latitude || sensorData.gps?.latitude || 15.4318,
          longitude: data?.location?.longitude || sensorData.gps?.longitude || 75.6586,
          placeName: data?.place || data?.placeName || 'Impact Site',
          acceleration: 4.85,
          speed: 0
        },
        aiState: { event: 'IMPACT', risk: 'CRITICAL' }
      };
      setPendingEmergency(fallbackAlert);
      setSensorData((prev) => ({
        ...prev,
        emergency: true,
        timestamp: new Date().toISOString()
      }));

      setAlerts((prev) => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          type: 'Impact Detected',
          severity: 'Emergency',
          status: 'Active',
          location: `${data?.location?.latitude || 'Unknown'}, ${data?.location?.longitude || ''}`,
          videoClipUrl: data?.videoClipUrl || data?.telemetry?.videoClipUrl || ''
        },
        ...prev
      ]);
    });

    // Watchdog interval checking for physical telemetry packet arrival every 1.5 seconds
    const watchdogInterval = setInterval(() => {
      const now = Date.now();
      if (lastTelemetryPacketRef.current > 0 && now - lastTelemetryPacketRef.current > 5500) {
        setEsp32Online(false);
        setSensorData((prev) => {
          if (prev.devices.esp32 === 'offline') return prev;
          return {
            ...prev,
            devices: {
              ...prev.devices,
              esp32: 'offline'
            }
          };
        });
      }
    }, 1500);

    return () => {
      clearInterval(watchdogInterval);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('esp32_status');
      socket.off('telemetry_update');
      socket.off('ai_prediction');
      socket.off('emergency_pending');
      socket.off('emergency_cancelled');
      socket.off('emergency_dispatched');
      socket.off('emergency');
    };
  }, []);

  // 3. Automatic Continuous Live Phone GPS Sync
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsSyncStatus('GPS Unsupported');
      return;
    }

    let isMounted = true;
    setGpsSyncStatus('● Auto-Syncing GPS...');

    const pushLocation = async (lat, lon, acc) => {
      try {
        const res = await syncDeviceLocation(lat, lon, acc);
        if (isMounted && res.success) {
          const accStr = acc ? `±${Math.round(acc)}m` : '±3m';
          setGpsSyncStatus(`● Live GPS (${accStr})`);
          setSensorData((prev) => ({
            ...prev,
            gps: {
              ...prev.gps,
              latitude: lat,
              longitude: lon,
              placeName: res.place || prev.gps.placeName,
              accuracy: accStr,
              locationStatus: 'RESOLVED'
            }
          }));
        }
      } catch (err) {
        console.warn('[Phone GPS Sync]', err.message);
      }
    };

    // Immediate fix
    navigator.geolocation.getCurrentPosition(
      (pos) => pushLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    // Continuous real-time movement watcher
    const watchId = navigator.geolocation.watchPosition(
      (pos) => pushLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      (err) => {
        if (err.code === 1) {
          setGpsSyncStatus('GPS Blocked');
        } else {
          setGpsSyncStatus('Searching GPS...');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    // Periodic 5-second pulse to guarantee persistent backend bridge freshness
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => pushLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 }
      );
    }, 5000);

    return () => {
      isMounted = false;
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, []);

  // Manual one-click sync button handler
  const handleSyncPhoneLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGpsSyncStatus('Syncing...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const res = await syncDeviceLocation(latitude, longitude, accuracy);
          if (res.success) {
            setGpsSyncStatus(`● Live GPS (±${Math.round(accuracy)}m)`);
            setSensorData((prev) => ({
              ...prev,
              gps: {
                ...prev.gps,
                latitude,
                longitude,
                placeName: res.place,
                accuracy: `±${Math.round(accuracy)}m`,
                locationStatus: 'RESOLVED'
              }
            }));
          } else {
            setGpsSyncStatus('Sync Failed');
          }
        } catch {
          setGpsSyncStatus('Sync Error');
        }
      },
      (err) => {
        alert('Could not retrieve location: ' + err.message);
        setGpsSyncStatus('');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Trigger test impact modal instantly on any page
  const handleTriggerTestImpact = useCallback(async (customTelemetry = {}) => {
    const isUnconscious = customTelemetry.type === 'UNCONSCIOUS_DROWSINESS' || String(customTelemetry.type).includes('DROWS');
    const alertData = {
      id: Date.now(),
      timestamp: Date.now(),
      countdown: 10,
      raw: { type: isUnconscious ? 'UNCONSCIOUS_DROWSINESS' : 'IMPACT' },
      telemetry: {
        latitude: sensorData.gps?.latitude || 15.4318,
        longitude: sensorData.gps?.longitude || 75.6586,
        speed: customTelemetry.speed || (isUnconscious ? 35.0 : 42.0),
        acceleration: customTelemetry.acceleration || (isUnconscious ? 1.0 : 4.85),
        mq3Value: customTelemetry.mq3Value || 120,
        placeName: sensorData.gps?.placeName || 'Hubballi - Dharwad Bypass Road',
        ...customTelemetry
      },
      aiState: { 
        event: isUnconscious ? 'UNCONSCIOUS_DROWSINESS' : 'HIGH_IMPACT_CRASH', 
        risk: 'CRITICAL',
        ...(customTelemetry.aiState || {})
      }
    };
    
    // Immediately open popup modal
    setPendingEmergency(alertData);
    setSensorData((prev) => ({
      ...prev,
      emergency: true,
      acceleration: isUnconscious ? 1.0 : 4.85,
      speed: 0
    }));

    try {
      await triggerTestImpact(customTelemetry);
    } catch (_) {}
  }, [sensorData.gps]);

  const handleAcknowledge = () => {
    setSensorData((prev) => ({ ...prev, emergency: false }));
    setAlerts((prev) =>
      prev.map((a) => (a.status === 'Active' ? { ...a, status: 'Resolved' } : a))
    );
  };

  const handleResetScore = async () => {
    try {
      const res = await resetSafetyScore();
      setSafetyData(res);
      voiceAlertService.speak('Driver safety score reset to 100', 'SYSTEM');
    } catch (_) {}
  };

  const sharedProps = {
    sensorData,
    chartData,
    alerts,
    safetyData,
    breadcrumbs,
    onResetScore: handleResetScore,
    connected,
    esp32Online,
    onAcknowledge: handleAcknowledge,
    onSyncGps: handleSyncPhoneLocation,
    onTriggerTestImpact: handleTriggerTestImpact,
    gpsSyncStatus
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0f1e]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar
          onMenuClick={() => setSidebarOpen(true)}
          connected={connected}
          esp32Online={esp32Online}
          onSyncGps={handleSyncPhoneLocation}
          gpsSyncStatus={gpsSyncStatus}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard {...sharedProps} />} />
            <Route path="/drowsiness" element={<Drowsiness sensorData={sensorData} />} />
            <Route path="/emergency" element={<EmergencyAlerts sensorData={sensorData} alerts={alerts} onAcknowledge={handleAcknowledge} onTriggerTestImpact={handleTriggerTestImpact} />} />
            <Route path="/gps" element={<GPSTracking sensorData={sensorData} onSyncGps={handleSyncPhoneLocation} gpsSyncStatus={gpsSyncStatus} breadcrumbs={breadcrumbs} />} />
            <Route path="/helmet" element={<HelmetStatus sensorData={sensorData} />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings {...sharedProps} />} />
          </Routes>
        </main>
      </div>

      {/* 10-Second High-Priority Impact Emergency Modal Popup */}
      {pendingEmergency && (
        <ImpactModal
          alertData={pendingEmergency}
          onClose={() => setPendingEmergency(null)}
          onAlertCancelled={() => {
            setPendingEmergency(null);
            setSensorData((prev) => ({ ...prev, emergency: false }));
          }}
          onAlertDispatched={() => {
            setSensorData((prev) => ({ ...prev, emergency: true }));
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
