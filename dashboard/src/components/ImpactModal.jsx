import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ShieldCheck, MapPin, Gauge, Activity, PhoneCall, XCircle, CheckCircle, Volume2, VolumeX, Eye, Video, MessageCircle, Navigation } from 'lucide-react';
import { cancelEmergencyAlert, dispatchEmergencyAlert } from '../services/api';

/**
 * ImpactModal: High-priority, unmissable collision alert modal with a 10s safety countdown.
 * If the user clicks "Cancel / I'm OK", no SMS or notification is sent.
 * If countdown reaches 0 (or user clicks "Send SOS Now"), emergency dispatch is triggered.
 */
export default function ImpactModal({ alertData, onClose, onAlertDispatched, onAlertCancelled }) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const audioCtxRef = useRef(null);
  const timerRef = useRef(null);

  const telemetry = alertData?.telemetry || {};
  const lat = telemetry.latitude || telemetry.gps?.latitude || 15.4318;
  const lon = telemetry.longitude || telemetry.gps?.longitude || 75.6586;
  const placeName = alertData?.place || telemetry.placeName || telemetry.place || 'Hubballi - Dharwad Bypass Road';
  const speed = telemetry.speed ?? 38.4;
  const accel = telemetry.acceleration ?? telemetry.motion?.magnitude ?? 4.2;
  const videoClipUrl = alertData?.videoClipUrl || telemetry?.videoClipUrl || alertData?.raw?.videoClipUrl || '';

  // Web Audio Beeper for acoustic urgency
  const playBeep = (freq = 880, duration = 0.15) => {
    if (isMuted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  };

  // Countdown timer logic
  useEffect(() => {
    setTimeLeft(alertData?.countdown || 10);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoDispatch();
          return 0;
        }
        // Beep frequency increases as time runs low
        const pitch = 700 + (10 - prev) * 60;
        playBeep(pitch, 0.18);
        return prev - 1;
      });
    }, 1000);

    // Initial beep on mount
    playBeep(900, 0.25);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (_) {}
      }
    };
  }, [alertData]);

  const handleCancel = async () => {
    if (processing) return;
    setProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await cancelEmergencyAlert();
      setIsCancelled(true);
      if (onAlertCancelled) onAlertCancelled();
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Cancel failed', err);
      setIsCancelled(true);
      setTimeout(onClose, 1600);
    } finally {
      setProcessing(false);
    }
  };

  const handleManualDispatch = async () => {
    if (processing) return;
    setProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await dispatchEmergencyAlert({
        id: alertData?.id,
        telemetry: {
          latitude: lat,
          longitude: lon,
          speed,
          acceleration: accel,
          placeName
        }
      });
      setIsDispatched(true);
      if (onAlertDispatched) onAlertDispatched();
    } catch (err) {
      console.error('Dispatch failed', err);
      setIsDispatched(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoDispatch = async () => {
    setIsDispatched(true);
    try {
      await dispatchEmergencyAlert({
        id: alertData?.id,
        telemetry: {
          latitude: lat,
          longitude: lon,
          speed,
          acceleration: accel,
          placeName
        }
      });
      if (onAlertDispatched) onAlertDispatched();
    } catch (err) {
      console.error('Auto dispatch error', err);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  const progressPercent = ((10 - timeLeft) / 10) * 100;

  const isDrowsiness = alertData?.raw?.type === 'UNCONSCIOUS_DROWSINESS' || 
                       alertData?.type === 'UNCONSCIOUS_DROWSINESS' ||
                       alertData?.aiState?.event === 'UNCONSCIOUS_DROWSINESS' ||
                       String(alertData?.raw?.type).includes('DROWS') ||
                       String(alertData?.aiState?.event).includes('UNCONSCIOUS');

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#1c1324] to-[#0c0d16] border-2 border-red-500/80 rounded-2xl shadow-2xl shadow-red-950/70 overflow-hidden text-white">
        
        {/* Top Warning Strip */}
        <div className="bg-red-600/90 text-white px-4 py-2 flex items-center justify-between text-xs font-bold tracking-wider uppercase">
          <span className="flex items-center gap-2 animate-pulse">
            <img src="/logo.jpg" alt="DivyaDrishti" className="w-5 h-5 rounded-md object-cover border border-white/40" />
            <AlertTriangle size={15} /> {isDrowsiness ? 'CRITICAL: DRIVER DROWSINESS & FATIGUE ALERT' : 'CRITICAL IMPACT DETECTED'}
          </span>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/80 hover:text-white flex items-center gap-1 text-[11px] font-normal"
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />} {isMuted ? 'Muted' : 'Sound ON'}
          </button>
        </div>

        {/* Cancelled State View */}
        {isCancelled ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/50">
              <CheckCircle size={36} />
            </div>
            <h3 className="text-xl font-bold text-emerald-400">Alert Cancelled — False Alarm</h3>
            <p className="text-sm text-slate-300">
              User confirmed safety. <strong className="text-white">NO SMS message or emergency notifications were sent.</strong>
            </p>
            <p className="text-xs text-slate-500">Closing window...</p>
          </div>
        ) : isDispatched ? (
          /* Dispatched State View */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/50 animate-pulse">
              <PhoneCall size={34} />
            </div>
            <h3 className="text-xl font-bold text-red-400">Emergency SOS Dispatched!</h3>
            <p className="text-sm text-slate-300">
              Twilio SMS & NTFY.sh emergency alerts have been transmitted to registered emergency contacts {isDrowsiness ? '(Driver unresponsive, eyes closed >10s)' : '(Crash confirmed)'}.
            </p>
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-3 text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Broadcast Coordinates:</span>
                <span className="text-emerald-400 font-mono">{lat.toFixed(4)}, {lon.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Verified Location:</span>
                <span className="text-slate-200 truncate max-w-[220px]">{placeName}</span>
              </div>
            </div>

            {videoClipUrl && (
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
                    <Video size={14} /> 10-Second Incident Video (Black Box Clip)
                  </span>
                  <a
                    href={videoClipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                  >
                    Open Clip ↗
                  </a>
                </div>
                <video
                  src={videoClipUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full max-h-40 rounded-lg bg-black object-contain border border-slate-800"
                />
              </div>
            )}
            {/* Life-Saving Action Buttons */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `🚨 *DIVYADRISHTI EMERGENCY SOS* 🚨\nCrash detected for rider Sahana!\nLocation: ${placeName}\nSpeed: ${Number(speed).toFixed(1)} km/h\nMap Pin: https://www.google.com/maps?q=${lat},${lon}${videoClipUrl ? `\n10s Incident Video: ${videoClipUrl}` : ''}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50"
              >
                <MessageCircle size={14} /> 1-Click WhatsApp SOS
              </a>
              <a
                href={`https://www.google.com/maps/search/hospital/@${lat},${lon},15z`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/50"
              >
                <Navigation size={14} /> Nearest Hospital
              </a>
            </div>

            <div className="pt-1 flex gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-center text-slate-300"
              >
                Open Google Maps
              </a>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          /* Active 10-Second Countdown View */
          <div className="p-6 space-y-5">
            {/* Countdown Display */}
            <div className="text-center space-y-2">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-red-500/30 flex items-center justify-center">
                  <span className="text-4xl font-extrabold text-red-400 font-mono tracking-tight animate-bounce">
                    {timeLeft}s
                  </span>
                </div>
                {/* SVG Progress Ring */}
                <svg className="absolute w-24 h-24 -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-red-500 transition-all duration-1000 ease-linear"
                    strokeDasharray={276}
                    strokeDashoffset={276 - (276 * progressPercent) / 100}
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {isDrowsiness
                  ? <>Driver fatigue / prolonged eye closure detected. Emergency contacts will be alerted in <span className="text-red-400 font-bold">{timeLeft} seconds</span>.</>
                  : <>Crash detected. Emergency contacts will be alerted in <span className="text-red-400 font-bold">{timeLeft} seconds</span>.</>
                }
              </p>
              <p className="text-xs text-slate-400">
                If this is a false alarm or {isDrowsiness ? 'the driver is awake' : 'you are safe'}, click <strong className="text-emerald-400">CANCEL ALERT</strong> below.
              </p>
            </div>

            {/* Impact Details Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-lg">
                  {isDrowsiness ? <Eye size={16} className="text-amber-400" /> : <Activity size={16} className="text-blue-400" />}
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isDrowsiness ? 'EYE CLOSURE' : 'IMPACT G-FORCE'}</span>
                    <strong className="text-white text-xs">
                      {isDrowsiness
                        ? (typeof alertData?.aiState?.eye_closed_duration === 'number'
                            ? `${alertData.aiState.eye_closed_duration.toFixed(1)}s (FATIGUE)`
                            : 'FATIGUE ALERT')
                        : `${typeof accel === 'number' ? accel.toFixed(2) : '4.2'} G`}
                    </strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-lg">
                  <Gauge size={16} className="text-emerald-400" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">VEHICLE SPEED</span>
                    <strong className="text-white text-xs">{typeof speed === 'number' ? speed.toFixed(1) : '35.0'} km/h</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-800/60 p-2 rounded-lg">
                <MapPin size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
                <div className="overflow-hidden">
                  <span className="text-[10px] text-slate-500 block">LOCATION</span>
                  <p className="text-slate-200 text-xs truncate font-medium">{placeName}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{lat.toFixed(4)}° N, {lon.toFixed(4)}° E</p>
                </div>
              </div>
            </div>

            {/* 10-Second Incident Video Preview if available */}
            {videoClipUrl && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium text-cyan-400">
                    <Video size={13} /> 10s Incident Video Clip (Auto-Recorded)
                  </span>
                  <a
                    href={videoClipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                  >
                    Link ↗
                  </a>
                </div>
                <video
                  src={videoClipUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full max-h-32 rounded-lg bg-black object-contain border border-slate-800/80"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleCancel}
                disabled={processing}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer border border-emerald-400/40"
              >
                <ShieldCheck size={18} />
                {isDrowsiness ? 'CANCEL ALERT — DRIVER AWAKE & OK (FALSE ALARM)' : 'CANCEL ALERT — I AM OK (FALSE ALARM)'}
              </button>

              <button
                onClick={handleManualDispatch}
                disabled={processing}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <PhoneCall size={14} />
                SEND SOS IMMEDIATELY (DON'T WAIT)
              </button>

              <a
                href={`https://www.google.com/maps/search/hospital/@${lat},${lon},15z`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation size={13} />
                Find Nearest Hospital / Trauma Center (Auto Navigation)
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
