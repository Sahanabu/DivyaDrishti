import React, { useState, useEffect, useRef } from 'react';
import { Video, AlertCircle, RefreshCw, Eye, Maximize2, Minimize2, Sliders, Shield, AlertTriangle, CheckCircle, Volume2, VolumeX, Navigation, Activity, Flame } from 'lucide-react';
import { BASE_URL, triggerTestImpact } from '../services/api';

/**
 * CameraFeed: Multi-mode Vision & Edge AI Simulator.
 * 1. AI Port Stream: Live stream from Python OpenCV + YOLOv8 + MediaPipe (Port 8000)
 * 2. Multi-Scenario Simulation:
 *    - Drowsiness: Bi-ocular EAR, blinking, eye closure > 2.0s, fatigue alerts
 *    - Lane Deviation: 3D perspective road with left/right drift & ADAS departure alarms
 *    - Crash Impact: Deceleration shockwave (4.85 G), speed collapse & 10s emergency popup activation
 */
export default function CameraFeed({ className = '' }) {
  const [sourceMode, setSourceMode] = useState('ai'); // 'ai' (Port 8000) | 'sim'
  const [streamError, setStreamError] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Simulation Categories: 'drowsiness' | 'lane' | 'impact'
  const [simCategory, setSimCategory] = useState('drowsiness');
  
  // Specific Scenario States:
  // Drowsiness: 'drowsy_normal' | 'drowsy_mild' | 'drowsy_severe'
  // Lane: 'lane_normal' | 'lane_left' | 'lane_right'
  // Impact: 'impact_normal' | 'impact_crash'
  const [simScenario, setSimScenario] = useState('drowsy_normal');
  const [simAutoCycle, setSimAutoCycle] = useState(false);
  const [simSoundEnabled, setSimSoundEnabled] = useState(false);

  // Live Metrics
  const [earMetric, setEarMetric] = useState(0.30);
  const [closureDuration, setClosureDuration] = useState(0.0);
  const [laneDeviationMeters, setLaneDeviationMeters] = useState(0.05);
  const [gForceMetric, setGForceMetric] = useState(1.0);
  const [impactShake, setImpactShake] = useState(0);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);
  const unconsciousTriggeredRef = useRef(false);

  const HOST = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  const AI_STREAM_URL = `http://${HOST}:8000/video_feed`;

  // Sound beeper for alerts
  const playAlertChime = (freq = 950) => {
    if (!simSoundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (_) {}
  };

  // Sync simulation events to backend to make entire dashboard dynamic
  const syncSimulationToBackend = async (scenario) => {
    try {
      if (scenario === 'drowsy_unconscious') {
        // Trigger high-priority 10-second emergency confirmation popup & SOS for unresponsive driver
        await triggerTestImpact({
          type: 'UNCONSCIOUS_DROWSINESS',
          speed: 35.0,
          acceleration: 1.0,
          placeName: 'Hubballi - Dharwad Bypass Road'
        });
      } else if (scenario.startsWith('drowsy')) {
        const payload = scenario === 'drowsy_severe'
          ? { event: 'SEVERE_DROWSINESS', risk: 'HIGH', confidence: 97.5 }
          : scenario === 'drowsy_mild'
          ? { event: 'DROWSY', risk: 'HIGH', confidence: 92.0 }
          : { event: 'NORMAL', risk: 'LOW', confidence: 89.0 };

        await fetch(`${BASE_URL}/ai/prediction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, timestamp: Date.now() })
        });
      } else if (scenario.startsWith('lane')) {
        // Only RIGHT lane departure triggers alert; left drift is safe/monitored
        const payload = scenario === 'lane_right'
          ? { event: 'LANE_DEVIATION', risk: 'MEDIUM', confidence: 93.5 }
          : { event: 'NORMAL', risk: 'LOW', confidence: 91.0 };

        await fetch(`${BASE_URL}/ai/prediction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, timestamp: Date.now() })
        });
      } else if (scenario === 'impact_crash') {
        // Trigger high G-force crash alert with 10s countdown modal
        await triggerTestImpact({
          acceleration: 4.85,
          speed: 42.0,
          placeName: 'Hubballi - Dharwad Bypass Road'
        });
      }
    } catch (_) {}
  };

  // Auto-cycle through all simulation scenarios
  useEffect(() => {
    if (sourceMode !== 'sim' || !simAutoCycle) return;

    const scenarios = [
      'drowsy_normal', 'drowsy_mild', 'drowsy_severe',
      'lane_normal', 'lane_left', 'lane_right',
      'impact_normal', 'impact_crash'
    ];

    const cycleInterval = setInterval(() => {
      setSimScenario((prev) => {
        const currIdx = scenarios.indexOf(prev);
        const next = scenarios[(currIdx + 1) % scenarios.length];
        
        if (next.startsWith('drowsy')) setSimCategory('drowsiness');
        else if (next.startsWith('lane')) setSimCategory('lane');
        else if (next.startsWith('impact')) setSimCategory('impact');

        syncSimulationToBackend(next);
        return next;
      });
    }, 5000);

    return () => clearInterval(cycleInterval);
  }, [sourceMode, simAutoCycle]);

  // Handle manual scenario selection
  const handleSelectScenario = (scenario, category) => {
    setSimAutoCycle(false);
    setSimCategory(category);
    setSimScenario(scenario);
    if (scenario === 'impact_crash') setImpactShake(24);
    syncSimulationToBackend(scenario);
  };

  // Canvas Simulation Render Loop
  useEffect(() => {
    if (sourceMode !== 'sim') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let eyeCloseTimer = 0;

    const render = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;

      // Handle screen shake on impact
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (simScenario === 'impact_crash' && frame % 2 === 0) {
        shakeOffsetX = (Math.random() - 0.5) * 16;
        shakeOffsetY = (Math.random() - 0.5) * 14;
      }

      ctx.save();
      ctx.translate(shakeOffsetX, shakeOffsetY);

      // ============================================================
      // SCENARIO 1: DROWSINESS SIMULATION (Face & Bi-Ocular EAR)
      // ============================================================
      if (simCategory === 'drowsiness') {
        const isMild = simScenario === 'drowsy_mild';
        const isSevere = simScenario === 'drowsy_severe';
        const isUnconscious = simScenario === 'drowsy_unconscious';
        const isClosed = isMild || isSevere || isUnconscious;

        if (isUnconscious && eyeCloseTimer < 10.0) {
          eyeCloseTimer = 10.1;
        } else if (isClosed) {
          eyeCloseTimer += 0.033;
        } else {
          eyeCloseTimer = 0;
          unconsciousTriggeredRef.current = false;
        }

        // Trigger automatic 10s emergency popup if eyes are closed for >= 10s
        if (eyeCloseTimer >= 10.0 && !unconsciousTriggeredRef.current) {
          unconsciousTriggeredRef.current = true;
          triggerTestImpact({
            type: 'UNCONSCIOUS_DROWSINESS',
            speed: 35.0,
            acceleration: 1.0,
            placeName: 'Hubballi - Dharwad Bypass Road'
          });
        }

        const calculatedEar = (isSevere || isUnconscious) ? 0.06 : isMild ? 0.14 : (0.28 + Math.sin(frame * 0.05) * 0.03);
        setEarMetric(Math.round(calculatedEar * 100) / 100);
        setClosureDuration(Math.round(eyeCloseTimer * 10) / 10);
        setLaneDeviationMeters(0.04);
        setGForceMetric(1.0);

        // Background
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, w, h);

        // Perspective grid
        ctx.strokeStyle = '#151e33';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Driver Head Nodding
        const headNod = (isSevere || isUnconscious) ? 18 + Math.sin(frame * 0.08) * 8 : isMild ? 10 + Math.sin(frame * 0.08) * 4 : Math.sin(frame * 0.04) * 2;
        const centerX = w / 2;
        const centerY = h / 2 + headNod;

        // Face Outline & Bounding Box
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 80, 110, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = isClosed ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = isClosed ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)';
        ctx.strokeRect(centerX - 95, centerY - 125, 190, 250);

        // Bi-Ocular Eyes
        const eyeY = centerY - 18;
        const leftEyeX = centerX - 36;
        const rightEyeX = centerX + 36;
        const eyeHeight = isClosed ? 2 : 11;

        [leftEyeX, rightEyeX].forEach((ex) => {
          ctx.beginPath();
          ctx.ellipse(ex, eyeY, 16, eyeHeight, 0, 0, Math.PI * 2);
          ctx.fillStyle = isClosed ? '#dc2626' : '#22c55e';
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ex - 18, eyeY); ctx.lineTo(ex + 18, eyeY);
          ctx.moveTo(ex, eyeY - 14); ctx.lineTo(ex, eyeY + 14);
          ctx.stroke();
        });

        // Nose & Mouth
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY); ctx.lineTo(centerX - 4, centerY + 14); ctx.lineTo(centerX + 6, centerY + 14);
        ctx.stroke();

        ctx.beginPath();
        if (isClosed) {
          ctx.ellipse(centerX, centerY + 42, 14, 10, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#dc2626';
          ctx.fill();
        } else {
          ctx.arc(centerX, centerY + 36, 14, 0.2 * Math.PI, 0.8 * Math.PI);
          ctx.stroke();
        }

        // Drowsiness / Unresponsive Alert Banner
        if (eyeCloseTimer >= 10.0 || isUnconscious) {
          ctx.fillStyle = 'rgba(220, 38, 38, 0.96)';
          ctx.fillRect(0, h - 60, w, 60);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `🚨 CRITICAL: DRIVER UNRESPONSIVE (EYES CLOSED FOR ${eyeCloseTimer.toFixed(1)}s)!`,
            w / 2, h - 35
          );
          ctx.font = '11px sans-serif';
          ctx.fillText('10-SECOND SAFETY WINDOW ACTIVE · CONFIRMATION POPUP OPENED · SOS ARMED', w / 2, h - 14);
          ctx.textAlign = 'left';
          if (frame % 25 === 0) playAlertChime(1050);
        } else if (isClosed) {
          ctx.fillStyle = 'rgba(220, 38, 38, 0.88)';
          ctx.fillRect(0, h - 55, w, 55);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            isSevere
              ? `⚠ SEVERE DROWSINESS: EYES CLOSED FOR ${eyeCloseTimer.toFixed(1)}s!`
              : `⚠ DROWSINESS DETECTED: LOW EAR (${calculatedEar.toFixed(2)})`,
            w / 2, h - 30
          );
          ctx.font = '11px sans-serif';
          ctx.fillText('BUZZER ACTIVATED · COGNITIVE FATIGUE ALERT SENT TO HELMET', w / 2, h - 12);
          ctx.textAlign = 'left';
          if (frame % 35 === 0) playAlertChime(920);
        }

      // ============================================================
      // SCENARIO 2: LANE DEVIATION SIMULATION (3D ADAS Highway)
      // ============================================================
      } else if (simCategory === 'lane') {
        const isLeft = simScenario === 'lane_left';
        const isRight = simScenario === 'lane_right';
        const isRightAlert = isRight; // Only right lane departure triggers alert

        const devVal = isLeft ? 1.35 : isRight ? 1.42 : 0.05;
        setLaneDeviationMeters(devVal);
        setEarMetric(0.29);
        setClosureDuration(0.0);
        setGForceMetric(1.02);

        const laneShift = isLeft ? 85 : isRight ? -85 : 0;

        // Sky & Ground
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, 150);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 150, w, h - 150);

        // Asphalt Road Perspective
        ctx.fillStyle = '#283143';
        ctx.beginPath();
        ctx.moveTo(w / 2 - 40, 150);
        ctx.lineTo(w / 2 + 40, 150);
        ctx.lineTo(w + 120 + laneShift, h);
        ctx.lineTo(-120 + laneShift, h);
        ctx.closePath();
        ctx.fill();

        // Dashed Center Divider
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 4;
        ctx.setLineDash([25, 20]);
        ctx.beginPath();
        ctx.moveTo(w / 2 + laneShift * 0.2, 150);
        ctx.lineTo(w / 2 + laneShift, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Left Lane Line (Always white / normal — left drift does NOT alert)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 35, 150);
        ctx.lineTo(40 + laneShift, h);
        ctx.stroke();

        // Right Lane Line (Red pulsating only when right deviation alert triggers)
        const rightAlert = isRightAlert;
        ctx.strokeStyle = rightAlert ? '#ef4444' : '#ffffff';
        ctx.lineWidth = rightAlert ? 6 : 4;
        ctx.beginPath();
        ctx.moveTo(w / 2 + 35, 150);
        ctx.lineTo(w - 40 + laneShift, h);
        ctx.stroke();

        // Car Crosshair in Center (Red only on right lane departure)
        ctx.strokeStyle = isRightAlert ? '#ef4444' : isLeft ? '#38bdf8' : '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(w / 2 - 25, h - 75, 50, 45);
        ctx.beginPath();
        ctx.moveTo(w / 2, h - 85); ctx.lineTo(w / 2, h - 30);
        ctx.moveTo(w / 2 - 35, h - 52); ctx.lineTo(w / 2 + 35, h - 52);
        ctx.stroke();

        // Lane Departure Alert Banner (ONLY for Right Lane Departure)
        if (isRight) {
          ctx.fillStyle = 'rgba(234, 88, 12, 0.9)';
          ctx.fillRect(0, h - 55, w, 55);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `⚠ RIGHT LANE DEPARTURE: DRIFTING RIGHT (${devVal}m)!`,
            w / 2, h - 30
          );
          ctx.font = '11px sans-serif';
          ctx.fillText('STEERING CORRECTION REQUIRED · RIGHT BOUNDARY ALARM ACTIVE', w / 2, h - 12);
          ctx.textAlign = 'left';
          if (frame % 30 === 0) playAlertChime(820);
        } else if (isLeft) {
          // Informational indicator for left drift (safe / non-alerting)
          ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
          ctx.fillRect(0, h - 45, w, 45);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('ℹ LEFT LANE DRIFT (1.35m) · MONITORED (ALERT CONFIGURED FOR RIGHT LANE ONLY)', w / 2, h - 24);
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('NORMAL OPERATION · NO AUDIBLE ALARM TRIGGERED', w / 2, h - 10);
          ctx.textAlign = 'left';
        }

      // ============================================================
      // SCENARIO 3: CRASH IMPACT SIMULATION (Deceleration & Shockwave)
      // ============================================================
      } else if (simCategory === 'impact') {
        const isCrash = simScenario === 'impact_crash';
        setGForceMetric(isCrash ? 4.85 : 1.0);
        setEarMetric(0.28);
        setLaneDeviationMeters(0.08);

        // Crash aura background
        ctx.fillStyle = isCrash ? '#450a0a' : '#0a0f1d';
        ctx.fillRect(0, 0, w, h);

        if (isCrash) {
          // Shockwave rings
          const waveRadius = (frame * 12) % 360;
          ctx.strokeStyle = `rgba(239, 68, 68, ${1 - waveRadius / 360})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, waveRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Broken glass crosshairs / collision point
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          for (let a = 0; a < 8; a++) {
            const angle = (a * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(w / 2, h / 2);
            ctx.lineTo(w / 2 + Math.cos(angle) * 160, h / 2 + Math.sin(angle) * 140);
            ctx.stroke();
          }

          // Centered crash symbol
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💥 IMPACT 4.85 G', w / 2, h / 2 + 10);
          ctx.textAlign = 'left';

          // Critical Crash Alert Banner
          ctx.fillStyle = 'rgba(220, 38, 38, 0.95)';
          ctx.fillRect(0, h - 60, w, 60);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🚨 HIGH-IMPACT COLLISION DETECTED (4.85 G)!', w / 2, h - 35);
          ctx.font = '12px sans-serif';
          ctx.fillText('10-SECOND SAFETY WINDOW ACTIVE · CLICK CANCEL ON POPUP IF SAFE', w / 2, h - 14);
          ctx.textAlign = 'left';

          if (frame % 25 === 0) playAlertChime(1100);
        } else {
          // Normal driving road
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 160, w, h - 160);
          ctx.fillStyle = '#283143';
          ctx.beginPath();
          ctx.moveTo(w / 2 - 30, 160); ctx.lineTo(w / 2 + 30, 160);
          ctx.lineTo(w + 60, h); ctx.lineTo(-60, h);
          ctx.fill();

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('IMPACT SENSOR ARMED · MONITORING G-FORCE DYNAMICS (25G GUARD)', w / 2, h / 2);
          ctx.textAlign = 'left';
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sourceMode, simCategory, simScenario, simSoundEnabled]);

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!isFullScreen) {
      if (containerRef.current.requestFullscreen) containerRef.current.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`glass-card p-4 relative flex flex-col overflow-hidden ${className}`}
    >
      {/* Top Header & Stream Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Video size={16} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              Vision & Multi-Scenario Feed
              <span className={`w-2 h-2 rounded-full ${sourceMode === 'sim' || (isStreaming && !streamError) ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </h3>
            <p className="text-slate-400 text-[11px]">
              {sourceMode === 'ai' ? 'Python FastAPI MJPEG (Port 8000)' : 'Interactive ADAS & Safety Simulator'}
            </p>
          </div>
        </div>

        {/* Source Switcher Pills (AI Port 8000 vs Simulation) */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-[11px]">
          <button
            onClick={() => setSourceMode('ai')}
            className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
              sourceMode === 'ai'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video size={13} />
            AI Port 8000
          </button>
          <button
            onClick={() => setSourceMode('sim')}
            className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
              sourceMode === 'sim'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders size={13} />
            AI Simulator
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center group">
        
        {/* Mode 1: Python AI Stream (Port 8000) */}
        {sourceMode === 'ai' && (
          <>
            {!streamError ? (
              <img
                src={AI_STREAM_URL}
                alt="Live AI Video Stream"
                className="w-full h-full object-cover"
                onLoad={() => {
                  setStreamError(false);
                  setIsStreaming(true);
                }}
                onError={() => {
                  setStreamError(true);
                  setIsStreaming(false);
                }}
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <AlertCircle size={32} className="text-amber-400 mx-auto" />
                <div>
                  <p className="text-white text-sm font-semibold">AI Stream Offline on Port 8000</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                    The Python AI process (<code className="text-slate-300">python main.py</code>) is not currently running.
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setSourceMode('sim')}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-950/40"
                  >
                    <Sliders size={13} /> Switch to AI Simulator
                  </button>
                  <button
                    onClick={() => {
                      setStreamError(false);
                      const img = new Image();
                      img.src = `${AI_STREAM_URL}?t=${Date.now()}`;
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Retry Connection
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Mode 2: Canvas Simulation */}
        {sourceMode === 'sim' && (
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-full object-cover"
          />
        )}

        {/* HUD Overlay */}
        {showOverlay && (sourceMode === 'sim' || (isStreaming && !streamError)) && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
            {/* Top Bar HUD */}
            <div className="flex justify-between items-start">
              <div className="bg-black/60 backdrop-blur-md border border-slate-700/60 rounded-lg px-2.5 py-1 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${simScenario.includes('severe') || simScenario.includes('crash') ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                <span className="text-[10px] text-white font-mono font-bold uppercase tracking-wider">
                  {sourceMode === 'sim' ? `SIMULATOR · ${simCategory.toUpperCase()} · 30 FPS` : 'AI STREAM · 640x480'}
                </span>
              </div>

              <div className="flex gap-2">
                {simCategory === 'drowsiness' && (
                  <div className="bg-black/60 backdrop-blur-md border border-slate-700/60 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                    <Eye size={12} className={simScenario !== 'drowsy_normal' ? 'text-red-400' : 'text-cyan-400'} />
                    <span className={`text-[10px] font-mono ${simScenario !== 'drowsy_normal' ? 'text-red-300' : 'text-cyan-300'}`}>
                      EAR: <strong>{earMetric}</strong>
                    </span>
                  </div>
                )}
                {simCategory === 'lane' && (
                  <div className="bg-black/60 backdrop-blur-md border border-slate-700/60 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                    <Navigation size={12} className={simScenario === 'lane_right' ? 'text-amber-400' : 'text-emerald-400'} />
                    <span className={`text-[10px] font-mono ${simScenario === 'lane_right' ? 'text-amber-300' : 'text-emerald-300'}`}>
                      DEV: <strong>{laneDeviationMeters}m</strong> {simScenario === 'lane_right' ? '(ALERT)' : simScenario === 'lane_left' ? '(SAFE)' : ''}
                    </span>
                  </div>
                )}
                {simCategory === 'impact' && (
                  <div className="bg-black/60 backdrop-blur-md border border-slate-700/60 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                    <Flame size={12} className={simScenario === 'impact_crash' ? 'text-red-400' : 'text-blue-400'} />
                    <span className={`text-[10px] font-mono ${simScenario === 'impact_crash' ? 'text-red-300' : 'text-blue-300'}`}>
                      G-FORCE: <strong>{gForceMetric} G</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Bar HUD */}
            <div className="flex justify-between items-end">
              <div className="bg-black/60 backdrop-blur-md border border-slate-700/60 rounded-lg px-2.5 py-1 flex items-center gap-2">
                <Shield size={12} className={(simScenario.includes('normal') || simScenario === 'lane_left') ? 'text-emerald-400' : 'text-red-400'} />
                <span className={`text-[10px] font-bold ${(simScenario.includes('normal') || simScenario === 'lane_left') ? 'text-emerald-400' : 'text-red-400'}`}>
                  STATE: {simScenario === 'lane_left' ? 'LANE LEFT (SAFE)' : simScenario.toUpperCase().replace('_', ' ')}
                </span>
              </div>
              {sourceMode === 'sim' && closureDuration > 0 && (
                <div className="bg-red-600/80 backdrop-blur-md border border-red-500 text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold animate-pulse">
                  CLOSURE: {closureDuration}s
                </div>
              )}
            </div>
          </div>
        )}

        {/* Viewport Control Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          {sourceMode === 'sim' && (
            <button
              onClick={() => setSimSoundEnabled(!simSoundEnabled)}
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700"
              title={simSoundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
            >
              {simSoundEnabled ? <Volume2 size={13} className="text-emerald-400" /> : <VolumeX size={13} />}
            </button>
          )}
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700"
            title="Toggle Overlays"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700"
            title="Full Screen"
          >
            {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Multi-Scenario Simulation Controls */}
      {sourceMode === 'sim' ? (
        <div className="mt-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
          {/* Category Selector Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSelectScenario('drowsy_normal', 'drowsiness')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  simCategory === 'drowsiness'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={12} /> Drowsiness
              </button>
              <button
                onClick={() => handleSelectScenario('lane_normal', 'lane')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  simCategory === 'lane'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Navigation size={12} /> Lane Deviation
              </button>
              <button
                onClick={() => handleSelectScenario('impact_normal', 'impact')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  simCategory === 'impact'
                    ? 'bg-red-600/30 text-red-300 border border-red-500/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame size={12} /> Impact Crash
              </button>
            </div>

            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={simAutoCycle}
                onChange={(e) => setSimAutoCycle(e.target.checked)}
                className="rounded accent-amber-500 w-3.5 h-3.5"
              />
              Auto-Cycle
            </label>
          </div>

          {/* Sub-Controls for Drowsiness */}
          {simCategory === 'drowsiness' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleSelectScenario('drowsy_normal', 'drowsiness')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                  simScenario === 'drowsy_normal'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <CheckCircle size={13} /> Awake (0.30)
              </button>
              <button
                onClick={() => handleSelectScenario('drowsy_mild', 'drowsiness')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                  simScenario === 'drowsy_mild'
                    ? 'bg-amber-600 text-white border-amber-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <AlertTriangle size={13} /> Drowsy (0.14)
              </button>
              <button
                onClick={() => handleSelectScenario('drowsy_severe', 'drowsiness')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                  simScenario === 'drowsy_severe'
                    ? 'bg-orange-600 text-white border-orange-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <AlertCircle size={13} /> Microsleep (&gt;2s)
              </button>
              <button
                onClick={() => handleSelectScenario('drowsy_unconscious', 'drowsiness')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all shadow-md ${
                  simScenario === 'drowsy_unconscious'
                    ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-red-900/60'
                    : 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border-red-800/60'
                }`}
              >
                <Flame size={13} /> Unresponsive (&gt;10s SOS)
              </button>
            </div>
          )}

          {/* Sub-Controls for Lane Deviation */}
          {simCategory === 'lane' && (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSelectScenario('lane_normal', 'lane')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                  simScenario === 'lane_normal'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <CheckCircle size={13} /> Centered (0.05m)
              </button>
              <button
                onClick={() => handleSelectScenario('lane_left', 'lane')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                  simScenario === 'lane_left'
                    ? 'bg-sky-700 text-white border-sky-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Left lane drift is monitored (safe / no alarm)"
              >
                <Navigation size={13} /> Drift Left (Safe)
              </button>
              <button
                onClick={() => handleSelectScenario('lane_right', 'lane')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                  simScenario === 'lane_right'
                    ? 'bg-orange-600 text-white border-orange-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Right lane drift triggers departure alarm"
              >
                <AlertTriangle size={13} /> Drift Right (Alert)
              </button>
            </div>
          )}

          {/* Sub-Controls for Impact Crash */}
          {simCategory === 'impact' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSelectScenario('impact_normal', 'impact')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  simScenario === 'impact_normal'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <CheckCircle size={14} /> Normal Riding (1.0 G)
              </button>
              <button
                onClick={() => handleSelectScenario('impact_crash', 'impact')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  simScenario === 'impact_crash'
                    ? 'bg-red-600 text-white border-red-400 animate-pulse'
                    : 'bg-red-900/60 hover:bg-red-800 text-red-200 border-red-600'
                }`}
              >
                <Flame size={14} /> Trigger Crash (4.85 G + 10s Popup)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Metrics for AI Port 8000 Stream Mode */
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg py-1.5 px-2">
            <span className="text-[10px] text-slate-500 uppercase block">Model Target</span>
            <span className="text-white font-semibold text-xs">Bi-Ocular EAR</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg py-1.5 px-2">
            <span className="text-[10px] text-slate-500 uppercase block">Closure Limit</span>
            <span className="text-cyan-400 font-semibold text-xs">&gt; 2.0s Alert</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg py-1.5 px-2">
            <span className="text-[10px] text-slate-500 uppercase block">AI Endpoint</span>
            <span className="text-emerald-400 font-semibold text-xs">Port 8000 Stream</span>
          </div>
        </div>
      )}
    </div>
  );
}
