/**
 * DivyaDrishti Web Speech ADAS Voice Alert Service
 * Speaks real-time acoustic voice warnings for safety critical driving events.
 */

class VoiceAlertService {
  constructor() {
    this.enabled = localStorage.getItem('divyadrishti_voice_adas') !== 'false';
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.lastSpokenTimes = {};
    this.cooldowns = {
      'LANE_DEPARTURE': 8000,
      'DROWSINESS': 6000,
      'UNCONSCIOUS': 15000,
      'FORWARD_COLLISION_WARNING': 4000,
      'IMPACT': 10000,
      'ALCOHOL_WARNING': 12000,
      'SYSTEM': 5000
    };
  }

  setEnabled(enable) {
    this.enabled = Boolean(enable);
    localStorage.setItem('divyadrishti_voice_adas', this.enabled ? 'true' : 'false');
    if (!this.enabled && this.synth) {
      this.synth.cancel();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  speak(text, alertType = 'SYSTEM', priority = false) {
    if (!this.enabled || !this.synth) return;

    const now = Date.now();
    const lastSpoken = this.lastSpokenTimes[alertType] || 0;
    const cooldown = this.cooldowns[alertType] || 5000;

    if (!priority && (now - lastSpoken < cooldown)) {
      return; // Skip if in cooldown to avoid chatter
    }

    try {
      if (priority) {
        this.synth.cancel(); // Interrupt non-critical speech for emergencies
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = alertType === 'IMPACT' || alertType === 'FORWARD_COLLISION_WARNING' ? 1.2 : 1.0;
      utterance.volume = 1.0;

      // Select natural English voice if available
      const voices = this.synth.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Zira')));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      this.synth.speak(utterance);
      this.lastSpokenTimes[alertType] = now;
    } catch (_) {}
  }

  announceEvent(event, details = '') {
    switch (String(event).toUpperCase()) {
      case 'LANE_DEPARTURE':
      case 'LANE_DEVIATION':
        this.speak('Warning. Lane departure detected. Please center your vehicle.', 'LANE_DEPARTURE');
        break;
      case 'DROWSINESS':
      case 'DROWSY':
      case 'SEVERE_DROWSINESS':
        this.speak('Warning. Drowsiness detected. Please stay alert or take a rest stop.', 'DROWSINESS');
        break;
      case 'UNCONSCIOUS_DROWSINESS':
      case 'UNCONSCIOUS_CRITICAL':
        this.speak('Critical alert! Driver unresponsive. Emergency protocol initiated!', 'UNCONSCIOUS', true);
        break;
      case 'FORWARD_COLLISION_WARNING':
      case 'FCW':
        this.speak('Caution! Rapid vehicle approach ahead. Brake now!', 'FORWARD_COLLISION_WARNING', true);
        break;
      case 'DISTRACTED':
        this.speak('Attention! Driver inattention. Please keep your eyes on the road.', 'DROWSINESS');
        break;
      case 'IMPACT':
      case 'CRASH':
        this.speak('Crash detected! Ten second emergency cancellation timer active.', 'IMPACT', true);
        break;
      case 'ALCOHOL_WARNING':
        this.speak('Warning. Elevated alcohol vapor detected on smart helmet.', 'ALCOHOL_WARNING');
        break;
      case 'TRIP_START':
        this.speak('DivyaDrishti safety system connected. Have a safe ride.', 'SYSTEM');
        break;
      case 'TRIP_END':
        this.speak('Trip completed. Safety score recorded.', 'SYSTEM');
        break;
      default:
        break;
    }
  }
}

export const voiceAlertService = new VoiceAlertService();
