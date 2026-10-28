const AIPrediction = require('../models/AIPrediction');

// In-memory real-time driving performance tracking
let liveSafetyScore = 96;
let scorePenaltyHistory = [];
let drivingMetrics = {
  smoothDrivingSeconds: 0,
  drowsinessEvents: 0,
  laneDepartures: 0,
  forwardCollisionWarnings: 0,
  hardBrakes: 0,
  alcoholWarnings: 0,
  lastUpdated: Date.now()
};

/**
 * Calculates safety penalty based on detected incident
 */
function recordSafetyEvent(eventType, severity = 'MEDIUM') {
  const now = Date.now();
  let penalty = 0;

  switch (String(eventType).toUpperCase()) {
    case 'DROWSINESS':
    case 'DROWSY':
      penalty = 8;
      drivingMetrics.drowsinessEvents += 1;
      break;
    case 'SEVERE_DROWSINESS':
    case 'UNCONSCIOUS_DROWSINESS':
      penalty = 20;
      drivingMetrics.drowsinessEvents += 1;
      break;
    case 'LANE_DEPARTURE':
    case 'LANE_DEVIATION':
      penalty = 4;
      drivingMetrics.laneDepartures += 1;
      break;
    case 'FORWARD_COLLISION_WARNING':
    case 'FCW':
      penalty = 12;
      drivingMetrics.forwardCollisionWarnings += 1;
      break;
    case 'HARD_BRAKE':
    case 'BRAKING':
      penalty = 5;
      drivingMetrics.hardBrakes += 1;
      break;
    case 'ALCOHOL_WARNING':
      penalty = 25;
      drivingMetrics.alcoholWarnings += 1;
      break;
    case 'IMPACT':
    case 'CRASH':
      penalty = 40;
      break;
    default:
      penalty = 0;
  }

  if (penalty > 0) {
    liveSafetyScore = Math.max(10, liveSafetyScore - penalty);
    scorePenaltyHistory.push({ eventType, penalty, timestamp: now });
    if (scorePenaltyHistory.length > 50) scorePenaltyHistory.shift();
  }

  drivingMetrics.lastUpdated = now;
  return liveSafetyScore;
}

/**
 * Periodically rewards smooth driving if no violations occur
 */
const rewardInterval = setInterval(() => {
  const now = Date.now();
  if (now - drivingMetrics.lastUpdated > 15000 && liveSafetyScore < 100) {
    liveSafetyScore = Math.min(100, liveSafetyScore + 1);
    drivingMetrics.smoothDrivingSeconds += 15;
    drivingMetrics.lastUpdated = now;
  }
}, 15000);
if (rewardInterval.unref) rewardInterval.unref();

function getLiveSafetyScore() {
  return {
    score: liveSafetyScore,
    grade: liveSafetyScore >= 90 ? 'A+' : (liveSafetyScore >= 80 ? 'A' : (liveSafetyScore >= 70 ? 'B' : 'C')),
    metrics: { ...drivingMetrics },
    recentPenalties: scorePenaltyHistory.slice(-5)
  };
}

function resetSafetyScore() {
  liveSafetyScore = 100;
  scorePenaltyHistory = [];
  drivingMetrics = {
    smoothDrivingSeconds: 0,
    drowsinessEvents: 0,
    laneDepartures: 0,
    forwardCollisionWarnings: 0,
    hardBrakes: 0,
    alcoholWarnings: 0,
    lastUpdated: Date.now()
  };
  return getLiveSafetyScore();
}

module.exports = {
  recordSafetyEvent,
  getLiveSafetyScore,
  resetSafetyScore
};
