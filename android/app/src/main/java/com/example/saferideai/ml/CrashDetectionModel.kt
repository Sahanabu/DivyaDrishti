package com.example.saferideai.ml

import android.content.Context
import com.example.saferideai.sensors.SensorData
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.*

enum class AppState {
    SAFE,
    MONITORING,
    DANGER,
    SOS_SENT
}

enum class HazardEvent {
    NONE,
    IMPACT,
    FALL,
    HARSH_BRAKE,
    SHARP_TURN,
    EXTREME_LEAN,
    SPEEDING
}

class CrashDetectionModel(private val context: Context? = null) {

    val aiPipeline = AiPipelineEngine()
    val aiMetrics: StateFlow<AiPipelineMetrics> = aiPipeline.metrics
    val pipelineMode: StateFlow<PipelineMode> = aiPipeline.mode

    private val _appState = MutableStateFlow(AppState.SAFE)
    val appState: StateFlow<AppState> = _appState.asStateFlow()

    private val _lastHazard = MutableStateFlow(HazardEvent.NONE)
    val lastHazard: StateFlow<HazardEvent> = _lastHazard.asStateFlow()

    private val _hazardRationale = MutableStateFlow("")
    val hazardRationale: StateFlow<String> = _hazardRationale.asStateFlow()

    // Real-Time Driver Safety Score Engine (0-100)
    private val _safetyScore = MutableStateFlow(100)
    val safetyScore: StateFlow<Int> = _safetyScore.asStateFlow()

    private val _driverGrade = MutableStateFlow("A+")
    val driverGrade: StateFlow<String> = _driverGrade.asStateFlow()

    // Incident counters for active trip
    private val _harshBrakesCount = MutableStateFlow(0)
    val harshBrakesCount: StateFlow<Int> = _harshBrakesCount.asStateFlow()

    private val _sharpTurnsCount = MutableStateFlow(0)
    val sharpTurnsCount: StateFlow<Int> = _sharpTurnsCount.asStateFlow()

    private val _crashesCount = MutableStateFlow(0)
    val crashesCount: StateFlow<Int> = _crashesCount.asStateFlow()

    private val _fallsCount = MutableStateFlow(0)
    val fallsCount: StateFlow<Int> = _fallsCount.asStateFlow()

    // Interactive Placement & Sensitivity State
    var phonePlacementMode: String = "AUTO" // "AUTO", "UPPER_POCKET", "PANT_POCKET", "HANDLEBAR_MOUNT"
    var gyroSensitivity: String = "BALANCED" // "BALANCED", "HIGH_SENSITIVITY", "AGGRESSIVE"

    // Physics Thresholds
    private val CRASH_IMPACT_G_THRESHOLD = 4.2f
    private val SPEED_CRASH_G_THRESHOLD = 3.2f
    private val HARSH_BRAKE_G_THRESHOLD = 1.4f
    private val SHARP_TURN_YAW_DEG_THRESHOLD = 110.0f
    private val EXTREME_LEAN_ANGLE_THRESHOLD = 48.0f
    private val SPEED_LIMIT_THRESHOLD_KMH = 80.0f

    // Dynamic Kinematic Tracking for Pockets
    private var lastPitch = 0.0f
    private var lastRoll = 0.0f
    private var lastGyro = 0.0f
    private var lastTimestamp = 0L

    private var lastRecoveryTime = System.currentTimeMillis()
    private var lastEventTime = 0L

    fun startMonitoring() {
        _appState.value = AppState.MONITORING
        _lastHazard.value = HazardEvent.NONE
        lastRecoveryTime = System.currentTimeMillis()
        lastTimestamp = 0L
        aiPipeline.setMode(PipelineMode.LIVE_SENSORS)
    }

    fun stopMonitoring() {
        _appState.value = AppState.SAFE
        _lastHazard.value = HazardEvent.NONE
    }

    fun resetSession() {
        _safetyScore.value = 100
        _driverGrade.value = "A+"
        _harshBrakesCount.value = 0
        _sharpTurnsCount.value = 0
        _crashesCount.value = 0
        _fallsCount.value = 0
        _lastHazard.value = HazardEvent.NONE
        lastTimestamp = 0L
        aiPipeline.resetWindow()
    }

    /**
     * Autonomous Sensor-Fusion and Biomechanical Pocket AI Inference.
     * Accurately distinguishes between normal riding/handling in upper/pant pockets
     * and real-world crash/fall dynamics where the gyroscope must generate the SOS.
     */
    fun processSensorData(data: SensorData, speedKmh: Float = 0f) {
        if (_appState.value == AppState.SAFE || _appState.value == AppState.SOS_SENT) return

        val now = System.currentTimeMillis()
        val dt = if (lastTimestamp > 0) (now - lastTimestamp).coerceIn(10L, 500L) / 1000f else 0.03f
        lastTimestamp = now

        // Calculate dynamic angular changes
        val deltaPitch = abs(data.pitch - lastPitch)
        val deltaRoll = abs(data.roll - lastRoll)
        val deltaTilt = max(deltaPitch, deltaRoll)
        val gyroJerk = abs(data.gyroDegMagnitude - lastGyro) / dt
        lastPitch = data.pitch
        lastRoll = data.roll
        lastGyro = data.gyroDegMagnitude

        // Execute Edge AI Pipeline stage
        val metrics = aiPipeline.processFrame(data, speedKmh)

        // 1. Smooth Driving Recovery (+1 point every 20 seconds of smooth riding)
        if (_appState.value == AppState.MONITORING && now - lastRecoveryTime >= 20000L) {
            if (_safetyScore.value < 100) {
                _safetyScore.value = (_safetyScore.value + 1).coerceAtMost(100)
                updateGrade()
            }
            lastRecoveryTime = now
        }

        // 2. CRITICAL ACCIDENT: High-G Kinetic Collision Crash (> 4.2G, or > 3.2G with vehicle speed >= 20 km/h)
        if (data.gForce >= CRASH_IMPACT_G_THRESHOLD || (data.gForce >= SPEED_CRASH_G_THRESHOLD && speedKmh >= 20f)) {
            _crashesCount.value += 1
            deductScore(40)
            val spdText = if (speedKmh > 5f) " at ${speedKmh.toInt()} km/h" else ""
            triggerDanger(HazardEvent.IMPACT, "Severe impact shock (${String.format("%.1f", data.gForce)}G$spdText) detected")
            return
        }

        // =========================================================================
        // REAL-WORLD GYROSCOPE & POCKET-AWARE ACCIDENT DETECTION
        // Addresses phone in Upper Jacket/Shirt Pocket or Pant/Trouser Pocket
        // =========================================================================

        val sensitivityMultiplier = when (gyroSensitivity) {
            "AGGRESSIVE" -> 0.80f
            "HIGH_SENSITIVITY" -> 0.90f
            else -> 1.0f // "BALANCED"
        }

        // A. UNIVERSAL EXTREME GYROSCOPIC TUMBLE (Ejection / Violent Somersault)
        val extremeTumbleThreshold = 220.0f * sensitivityMultiplier
        if (data.gyroDegMagnitude >= extremeTumbleThreshold && (data.gForce >= 1.8f || deltaTilt >= 35.0f)) {
            _fallsCount.value += 1
            deductScore(35)
            val locationContext = if (phonePlacementMode == "PANT_POCKET") " (Pant Pocket)" else if (phonePlacementMode == "UPPER_POCKET") " (Upper Pocket)" else ""
            triggerDanger(HazardEvent.FALL, "Violent rotational tumble (${data.gyroDegMagnitude.toInt()}°/s)$locationContext detected via gyroscope")
            return
        }

        // B. PANT POCKET LOGIC:
        // When seated on a motorcycle, the thigh is angled ~70° to 90° from vertical.
        // Therefore, raw orientation angle is NOT a crash indicator.
        // Instead, a real fall/slide causes violent thigh angular tumble (gyro >= 110°/s),
        // rapid tilt delta (thigh twisting into road), and drop in velocity or kinetic shock (>= 2.0G).
        val isPantPocket = phonePlacementMode == "PANT_POCKET" || phonePlacementMode == "AUTO"
        val pantGyroThreshold = 110.0f * sensitivityMultiplier
        if (isPantPocket && data.gyroDegMagnitude >= pantGyroThreshold) {
            val hasImpactShock = data.gForce >= 2.0f
            val hasDynamicTumbleAtSpeed = speedKmh >= 10.0f && deltaTilt >= 30.0f
            val hasSuddenRotationalSpike = gyroJerk >= 400.0f && data.gForce >= 1.7f

            if (hasImpactShock || hasDynamicTumbleAtSpeed || hasSuddenRotationalSpike) {
                _fallsCount.value += 1
                deductScore(35)
                val spdText = if (speedKmh > 5f) " at ${speedKmh.toInt()} km/h" else ""
                triggerDanger(HazardEvent.FALL, "Motorcycle fall / slide detected via pant pocket gyroscopic dynamics (${data.gyroDegMagnitude.toInt()}°/s$spdText)")
                return
            }
        }

        // C. UPPER POCKET LOGIC (Jacket / Shirt Pocket):
        // Phone moves with the upper torso. High-side ejection or slide produces sudden torso pitch-forward/roll
        // with high angular rate (gyro >= 120°/s) and kinetic ground contact (>= 2.1G) or speed.
        val isUpperPocket = phonePlacementMode == "UPPER_POCKET" || phonePlacementMode == "AUTO"
        val upperGyroThreshold = 120.0f * sensitivityMultiplier
        if (isUpperPocket && data.gyroDegMagnitude >= upperGyroThreshold) {
            val hasTorsoFlip = deltaTilt >= 38.0f
            val hasGroundImpact = data.gForce >= 2.1f
            val hasRidingSpeed = speedKmh >= 10.0f

            if ((hasTorsoFlip && (hasRidingSpeed || hasGroundImpact)) || (hasGroundImpact && hasRidingSpeed)) {
                _fallsCount.value += 1
                deductScore(35)
                val spdText = if (speedKmh > 5f) " at ${speedKmh.toInt()} km/h" else ""
                triggerDanger(HazardEvent.FALL, "Ejection / torso fall detected via upper pocket gyroscope (${data.gyroDegMagnitude.toInt()}°/s$spdText)")
                return
            }
        }

        // D. LOW-SIDE SLIDE / FALL WITH TILT CONFIRMATION (Handlebar Mount or Invariant Lean)
        val orientationTilt = max(abs(data.roll), abs(data.pitch))
        val isDynamicFallAtSpeed = orientationTilt >= 60.0f && speedKmh >= 10.0f && data.gyroDegMagnitude >= (60.0f * sensitivityMultiplier)
        val isViolentImpactFall = orientationTilt >= 65.0f && data.gForce >= 2.5f && data.gyroDegMagnitude >= (85.0f * sensitivityMultiplier)

        if (isDynamicFallAtSpeed || isViolentImpactFall) {
            _fallsCount.value += 1
            deductScore(35)
            val spdText = if (speedKmh > 5f) " at ${speedKmh.toInt()} km/h" else ""
            triggerDanger(HazardEvent.FALL, "Motorcycle fall detected (Tilt: ${orientationTilt.toInt()}°, Gyro: ${data.gyroDegMagnitude.toInt()}°/s$spdText)")
            return
        }

        // E. COMBINED SHOCK + TILT (3.5G + 50 deg tilt)
        if (data.gForce >= 3.5f && (abs(data.roll) > 50f || abs(data.pitch) > 50f)) {
            _crashesCount.value += 1
            deductScore(40)
            triggerDanger(HazardEvent.IMPACT, "Combined impact shock and tilt detected")
            return
        }

        // Non-crash ADAS Warnings (Debounced by 3 seconds)
        if (_appState.value == AppState.MONITORING && now - lastEventTime > 3000L) {
            // Sudden Harsh Braking (Deceleration shock)
            if (data.gForce >= HARSH_BRAKE_G_THRESHOLD && data.accelY < -3.5f) {
                lastEventTime = now
                _harshBrakesCount.value += 1
                deductScore(10)
                _lastHazard.value = HazardEvent.HARSH_BRAKE
                _hazardRationale.value = "Sudden harsh braking detected"
            }
            // Gyroscope Sharp / Reckless Turn (High yaw rate at speed)
            else if (abs(data.gyroDegZ) >= SHARP_TURN_YAW_DEG_THRESHOLD && speedKmh > 18f) {
                lastEventTime = now
                _sharpTurnsCount.value += 1
                deductScore(10)
                _lastHazard.value = HazardEvent.SHARP_TURN
                _hazardRationale.value = "Sharp turn (${abs(data.gyroDegZ).toInt()}°/s yaw) at ${speedKmh.toInt()} km/h"
            }
            // Gyroscope Dangerous Lean Angle (Peg scraping / loss of grip)
            else if (abs(data.leanAngle) >= EXTREME_LEAN_ANGLE_THRESHOLD && speedKmh > 20f) {
                lastEventTime = now
                deductScore(10)
                _lastHazard.value = HazardEvent.EXTREME_LEAN
                _hazardRationale.value = "Extreme motorcycle lean (${abs(data.leanAngle).toInt()}°) warning"
            }
            // Speedometer Excessive Speed (> 80 km/h)
            else if (speedKmh > SPEED_LIMIT_THRESHOLD_KMH) {
                lastEventTime = now
                deductScore(15)
                _lastHazard.value = HazardEvent.SPEEDING
                _hazardRationale.value = "Speedometer warning: ${speedKmh.toInt()} km/h exceeds safe limit"
            }
        }
    }

    fun deductScore(points: Int) {
        _safetyScore.value = (_safetyScore.value - points).coerceAtLeast(0)
        updateGrade()
    }

    private fun updateGrade() {
        val s = _safetyScore.value
        _driverGrade.value = when {
            s >= 90 -> "A+"
            s >= 80 -> "A"
            s >= 70 -> "B"
            s >= 60 -> "C"
            else -> "D"
        }
    }

    private fun triggerDanger(hazard: HazardEvent, rationale: String) {
        _lastHazard.value = hazard
        _hazardRationale.value = rationale
        _appState.value = AppState.DANGER
    }

    fun resolveDanger() {
        _appState.value = AppState.MONITORING
        _lastHazard.value = HazardEvent.NONE
        _hazardRationale.value = ""
    }

    fun markSosSent() {
        _appState.value = AppState.SOS_SENT
    }

    // Simulation triggers
    fun simulateCrash() {
        _crashesCount.value += 1
        deductScore(40)
        aiPipeline.setMode(PipelineMode.SIMULATION)
        triggerDanger(HazardEvent.IMPACT, "Simulated 5.2G high-speed frontal collision")
    }

    fun simulateFall() {
        _fallsCount.value += 1
        deductScore(35)
        aiPipeline.setMode(PipelineMode.SIMULATION)
        triggerDanger(HazardEvent.FALL, "Simulated pocket gyroscopic tumble & 74° motorcycle fall")
    }

    fun simulateHarshBrake() {
        _harshBrakesCount.value += 1
        deductScore(10)
        _lastHazard.value = HazardEvent.HARSH_BRAKE
        _hazardRationale.value = "Simulated sudden emergency brake (-5.2 m/s²)"
    }

    fun simulateSharpTurn() {
        _sharpTurnsCount.value += 1
        deductScore(10)
        _lastHazard.value = HazardEvent.SHARP_TURN
        _hazardRationale.value = "Simulated high-speed 135°/s sharp turn"
    }

    fun simulateScenario(scenario: SimulationScenario) {
        aiPipeline.setMode(PipelineMode.SIMULATION)
        when (scenario) {
            SimulationScenario.CRASH_5G -> simulateCrash()
            SimulationScenario.ROLLOVER_FALL -> simulateFall()
            SimulationScenario.HARSH_BRAKE -> simulateHarshBrake()
            SimulationScenario.EXTREME_LEAN -> {
                _lastHazard.value = HazardEvent.EXTREME_LEAN
                _hazardRationale.value = "Simulated 51° extreme motorcycle cornering lean"
            }
            SimulationScenario.SPEEDING -> {
                _lastHazard.value = HazardEvent.SPEEDING
                _hazardRationale.value = "Simulated overspeed alert (94 km/h in 60 zone)"
            }
            SimulationScenario.NORMAL_CRUISE -> {
                _lastHazard.value = HazardEvent.NONE
                _hazardRationale.value = "Simulated safe cruise (42 km/h • 1.02G)"
                _appState.value = AppState.MONITORING
            }
        }
    }
}
