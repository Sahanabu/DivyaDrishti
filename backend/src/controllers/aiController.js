const { getLiveSafetyScore, resetSafetyScore } = require('../services/aiService');
const AIPrediction = require('../models/AIPrediction');

const getLiveSafetyScoreEndpoint = async (req, res) => {
  try {
    const safety = getLiveSafetyScore();
    res.status(200).json({ success: true, ...safety });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const resetSafetyScoreEndpoint = async (req, res) => {
  try {
    const result = resetSafetyScore();
    res.status(200).json({ success: true, message: 'Driver Safety Score reset to 100', ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAiStatsEndpoint = async (req, res) => {
  try {
    const totalPredictions = await AIPrediction.countDocuments();
    const criticalEvents = await AIPrediction.countDocuments({ risk: 'CRITICAL' });
    const highRiskEvents = await AIPrediction.countDocuments({ risk: 'HIGH' });
    const normalEvents = await AIPrediction.countDocuments({ event: 'NORMAL' });
    const recentPredictions = await AIPrediction.find().sort({ timestamp: -1 }).limit(10);

    res.status(200).json({
      success: true,
      stats: {
        totalPredictions,
        criticalEvents,
        highRiskEvents,
        normalEvents,
        accuracyTarget: '94.8%'
      },
      recent: recentPredictions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getLiveSafetyScoreEndpoint,
  resetSafetyScoreEndpoint,
  getAiStatsEndpoint
};
