package com.example.saferideai.ml

import com.example.saferideai.sensors.SensorData
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.*

enum class ThreatLevel(val label: String, val scoreImpact: Int) {
    NORMAL("NORMAL", 0),
    CAUTION("CAUTION", 5),
    WARNING("HIGH WARNING", 15),
    CRITICAL("CRITICAL EMERGENCY", 40)
}

enum class PipelineMode {
    LIVE_SENSORS,
    SIMULATION
}

data class AiPipelineMetrics(
    val peakG: Float = 1.0f,
    val jerk: Float = 0.0f,
    val gyroRmsDeg: Float = 0.0f,
    val leanAngle: Float = 0.0f,
    val speedKmh: Float = 0.0f,
    val crashProbability: Float = 0.01f, // 0.0 to 1.0
    val riskPercentage: Int = 1,          // 0% to 100%
    val threatLevel: ThreatLevel = ThreatLevel.NORMAL,
    val activeHazard: HazardEvent = HazardEvent.NONE,
    val inferenceTimeMs: Float = 0.05f,
    val rationale: String = "AI Pipeline: Stable Riding Dynamics",
    val mode: PipelineMode = PipelineMode.LIVE_SENSORS
)

class AiPipelineEngine {

    private val _metrics = MutableStateFlow(AiPipelineMetrics())
    val metrics: StateFlow<AiPipelineMetrics> = _metrics.asStateFlow()

    private val _mode = MutableStateFlow(PipelineMode.LIVE_SENSORS)
    val mode: StateFlow<PipelineMode> = _mode.asStateFlow()

    // Preallocated circular buffer for temporal window feature extraction (20 samples)
    private val WINDOW_SIZE = 20
    private val gBuffer = FloatArray(WINDOW_SIZE) { 1.0f }
    private val gyroBuffer = FloatArray(WINDOW_SIZE) { 0.0f }
    private var bufferIdx = 0
    private var lastG = 1.0f
    private var lastTimestamp = 0L

    fun setMode(newMode: PipelineMode) {
        _mode.value = newMode
    }

    /**
     * Autonomous Edge AI Pipeline processing live or simulated sensor telemetry.
     * Stage 1: Feature Extraction (Peak G, Jerk, Angular Energy)
     * Stage 2: Dual-Model Kinetic & Orientation Inference (Sigmoid activations)
     * Stage 3: Temporal Post-Impact Validation & False-Positive Filter
     * Stage 4: Risk Scoring & Threat Level Output
     */
    fun processFrame(data: SensorData, speedKmh: Float, isSimulated: Boolean = false): AiPipelineMetrics {
        val startNano = System.nanoTime()
        val now = if (data.timestamp > 0) data.timestamp else System.currentTimeMillis()
        val dt = if (lastTimestamp > 0) (now - lastTimestamp).coerceIn(10L, 500L) / 1000f else 0.02f
        lastTimestamp = now

        val currentG = data.gForce.coerceIn(0.1f, 25.0f)
        val currentGyroDeg = data.gyroDegMagnitude

        // 1. Stage 1: Temporal Window Updates
        gBuffer[bufferIdx] = currentG
        gyroBuffer[bufferIdx] = currentGyroDeg
        bufferIdx = (bufferIdx + 1) % WINDOW_SIZE

        // Compute Peak G and Jerk in temporal window
        var maxG = 0.0f
        var sumG = 0.0f
        var sumGyroSq = 0.0f
        for (i in 0 until WINDOW_SIZE) {
            val g = gBuffer[i]
            if (g > maxG) maxG = g
            sumG += g
            val w = gyroBuffer[i]
            sumGyroSq += (w * w)
        }
        val avgG = sumG / WINDOW_SIZE
        val gyroRms = sqrt((sumGyroSq / WINDOW_SIZE).toDouble()).toFloat()
        val jerk = abs(currentG - lastG) / dt
        lastG = currentG

        val absLean = abs(data.leanAngle)
        val absRoll = abs(data.roll)
        val absPitch = abs(data.pitch)

        // 2. Stage 2: Multi-Model Edge AI Inference (Vectorized Sigmoid Estimations)
        // Kinetic Impact Model: Shock amplitude + sudden jerk + forward velocity
        val kineticZ = (maxG * 1.8f) + (jerk * 0.08f) + (speedKmh * 0.04f) - 8.2f
        val pImpact = sigmoid(kineticZ)

        // Rollover / Lowside Fall Model: Activated with respect to Speed and Gyroscope dynamics
        val orientationAngle = max(absLean, max(absRoll, absPitch))
        val isStaticHandling = speedKmh < 8.0f && maxG < 2.0f && currentGyroDeg < 60.0f

        val pFall = if (isStaticHandling) {
            0.01f // Stationary handheld tilt or desk handling is strictly safe
        } else {
            val rolloverZ = (orientationAngle * 0.06f) + (currentGyroDeg * 0.035f) + (maxG * 0.6f) + (speedKmh * 0.03f) - 6.5f
            sigmoid(rolloverZ)
        }

        // Composite AI Crash Probability (0.0 to 1.0)
        val pCrash = max(pImpact, pFall).coerceIn(0.0f, 1.0f)
        val riskPercent = (pCrash * 100f).roundToInt().coerceIn(0, 100)

        // 3. Stage 3 & 4: Hazard Classification & Threat Assessment
        val (hazard, threatLevel, rationale) = when {
            // Severe Collision Crash
            maxG >= 4.2f || (maxG >= 3.2f && speedKmh >= 20f) || pImpact >= 0.75f -> {
                Triple(
                    HazardEvent.IMPACT,
                    ThreatLevel.CRITICAL,
                    "CRITICAL: Kinetic Collision Impact (Peak G: ${String.format("%.1f", maxG)}G, Jerk: ${jerk.toInt()} G/s)"
                )
            }
            // Motorcycle Rollover / Lowside Fall / Pocket Gyroscope Tumble
            !isStaticHandling && ((currentGyroDeg >= 110f && (maxG >= 1.8f || speedKmh >= 10f)) ||
                    (orientationAngle >= 60f && speedKmh >= 10f && currentGyroDeg >= 60f) ||
                    (orientationAngle >= 65f && maxG >= 2.5f && currentGyroDeg >= 80f) ||
                    pFall >= 0.72f) -> {
                Triple(
                    HazardEvent.FALL,
                    ThreatLevel.CRITICAL,
                    "CRITICAL: Gyroscope Tumble / Bike Fall (Rate: ${currentGyroDeg.toInt()}°/s • G: ${String.format("%.1f", maxG)}G at ${speedKmh.toInt()} km/h)"
                )
            }
            // Excessive Motorcycle Lean Warning
            absLean >= 48f && speedKmh >= 20f -> {
                Triple(
                    HazardEvent.EXTREME_LEAN,
                    ThreatLevel.WARNING,
                    "WARNING: Dangerous Motorcycle Lean (${absLean.toInt()}° at ${speedKmh.toInt()} km/h)"
                )
            }
            // Dangerous Cornering Yaw Rate
            data.gyroDegZ >= 110f && speedKmh >= 18f -> {
                Triple(
                    HazardEvent.SHARP_TURN,
                    ThreatLevel.WARNING,
                    "WARNING: High-Speed Cornering Yaw Rate (${data.gyroDegZ.toInt()}°/s)"
                )
            }
            // Sudden Harsh Braking
            data.accelY < -3.5f || (currentG > 1.4f && data.pitch > 15f) -> {
                Triple(
                    HazardEvent.HARSH_BRAKE,
                    ThreatLevel.CAUTION,
                    "CAUTION: Sudden Harsh Braking (Decel: ${String.format("%.1f", abs(data.accelY))} m/s²)"
                )
            }
            // Overspeed Alert
            speedKmh > 80f -> {
                Triple(
                    HazardEvent.SPEEDING,
                    ThreatLevel.CAUTION,
                    "CAUTION: Speeding above safety threshold (${speedKmh.toInt()} km/h)"
                )
            }
            // Normal Steady Driving
            else -> {
                Triple(
                    HazardEvent.NONE,
                    if (riskPercent > 20) ThreatLevel.CAUTION else ThreatLevel.NORMAL,
                    "AI Pipeline: Dynamics Stable (${speedKmh.toInt()} km/h • ${String.format("%.2f", currentG)}G)"
                )
            }
        }

        val elapsedMs = (System.nanoTime() - startNano) / 1_000_000f

        val result = AiPipelineMetrics(
            peakG = maxG,
            jerk = jerk,
            gyroRmsDeg = gyroRms,
            leanAngle = data.leanAngle,
            speedKmh = speedKmh,
            crashProbability = pCrash,
            riskPercentage = riskPercent,
            threatLevel = threatLevel,
            activeHazard = hazard,
            inferenceTimeMs = elapsedMs,
            rationale = rationale,
            mode = if (isSimulated) PipelineMode.SIMULATION else PipelineMode.LIVE_SENSORS
        )

        _metrics.value = result
        return result
    }

    fun resetWindow() {
        gBuffer.fill(1.0f)
        gyroBuffer.fill(0.0f)
        bufferIdx = 0
        lastG = 1.0f
        lastTimestamp = 0L
    }

    /**
     * Injects simulated event scenarios into the AI pipeline for comprehensive testing.
     */
    fun injectSimulation(scenario: SimulationScenario): AiPipelineMetrics {
        resetWindow()
        _mode.value = PipelineMode.SIMULATION
        val fakeData = when (scenario) {
            SimulationScenario.CRASH_5G -> SensorData(
                accelX = 18.0f, accelY = -42.0f, accelZ = 12.0f,
                accelerationMagnitude = 51.0f, gForce = 5.2f,
                pitch = 28.0f, roll = 44.0f, leanAngle = 38.0f,
                gyroDegMagnitude = 295.0f,
                timestamp = System.currentTimeMillis()
            )
            SimulationScenario.ROLLOVER_FALL -> SensorData(
                accelX = -8.0f, accelY = -2.0f, accelZ = 2.0f,
                accelerationMagnitude = 8.5f, gForce = 1.1f,
                pitch = 18.0f, roll = 74.0f, leanAngle = 72.0f,
                gyroDegMagnitude = 180.0f,
                timestamp = System.currentTimeMillis()
            )
            SimulationScenario.HARSH_BRAKE -> SensorData(
                accelX = 0.5f, accelY = -5.2f, accelZ = 9.8f,
                accelerationMagnitude = 14.5f, gForce = 1.48f,
                pitch = 22.0f, roll = 4.0f, leanAngle = 5.0f,
                gyroDegMagnitude = 45.0f,
                timestamp = System.currentTimeMillis()
            )
            SimulationScenario.EXTREME_LEAN -> SensorData(
                accelX = 7.5f, accelY = 1.2f, accelZ = 6.8f,
                accelerationMagnitude = 10.2f, gForce = 1.05f,
                pitch = 5.0f, roll = 52.0f, leanAngle = 51.0f,
                gyroDegZ = 125.0f, gyroDegMagnitude = 135.0f,
                timestamp = System.currentTimeMillis()
            )
            SimulationScenario.SPEEDING -> SensorData(
                accelX = 0.2f, accelY = 0.4f, accelZ = 9.8f,
                accelerationMagnitude = 9.81f, gForce = 1.0f,
                pitch = 2.0f, roll = 1.0f, leanAngle = 0.0f,
                gyroDegMagnitude = 15.0f,
                timestamp = System.currentTimeMillis()
            )
            SimulationScenario.NORMAL_CRUISE -> SensorData(
                accelX = 0.1f, accelY = 0.0f, accelZ = 9.81f,
                accelerationMagnitude = 9.81f, gForce = 1.0f,
                pitch = 0.0f, roll = 0.0f, leanAngle = 2.0f,
                gyroDegMagnitude = 8.0f,
                timestamp = System.currentTimeMillis()
            )
        }

        val speed = when (scenario) {
            SimulationScenario.CRASH_5G -> 48.0f
            SimulationScenario.ROLLOVER_FALL -> 32.0f
            SimulationScenario.HARSH_BRAKE -> 55.0f
            SimulationScenario.EXTREME_LEAN -> 62.0f
            SimulationScenario.SPEEDING -> 94.0f
            SimulationScenario.NORMAL_CRUISE -> 42.0f
        }

        return processFrame(fakeData, speed, isSimulated = true)
    }

    private fun sigmoid(x: Float): Float {
        return (1.0 / (1.0 + exp(-x.toDouble()))).toFloat()
    }
}

enum class SimulationScenario(val displayName: String, val iconDescription: String) {
    CRASH_5G("High-G Crash (5.2G)", "Collision Impact"),
    ROLLOVER_FALL("Rollover Fall (74°)", "Lowside Fall"),
    HARSH_BRAKE("Harsh Brake (-5.2 m/s²)", "Emergency Stop"),
    EXTREME_LEAN("Extreme Lean (51°)", "Cornering Warning"),
    SPEEDING("Overspeed (94 km/h)", "Speed Warning"),
    NORMAL_CRUISE("Normal Ride (42 km/h)", "Safe Driving")
}
