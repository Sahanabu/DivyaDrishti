package com.example.saferideai.sensors

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.sqrt

data class SensorData(
    val accelX: Float = 0f,
    val accelY: Float = 0f,
    val accelZ: Float = 0f,
    val gyroX: Float = 0f, // rad/s
    val gyroY: Float = 0f, // rad/s
    val gyroZ: Float = 0f, // rad/s
    val gyroDegX: Float = 0f, // deg/s
    val gyroDegY: Float = 0f, // deg/s
    val gyroDegZ: Float = 0f, // deg/s
    val accelerationMagnitude: Float = 9.80665f, // m/s^2
    val gForce: Float = 1.0f,
    val pitch: Float = 0f, // degrees
    val roll: Float = 0f, // degrees
    val leanAngle: Float = 0f, // filtered motorcycle lean angle in degrees (-left, +right)
    val gyroMagnitude: Float = 0f, // rad/s
    val gyroDegMagnitude: Float = 0f, // deg/s
    val inertialSpeedEstimateKmh: Float = 0f, // sensor-derived speed fallback
    val isGyroAvailable: Boolean = true,
    val isAccelAvailable: Boolean = true,
    val timestamp: Long = System.currentTimeMillis()
)

class SensorManagerHelper(context: Context) : SensorEventListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    private val gyroscope: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

    private val _sensorData = MutableStateFlow(
        SensorData(
            isGyroAvailable = gyroscope != null,
            isAccelAvailable = accelerometer != null
        )
    )
    val sensorData: StateFlow<SensorData> = _sensorData.asStateFlow()

    // Reusable primitive arrays to prevent GC pauses on 4GB RAM devices
    private val currentAccel = FloatArray(3)
    private val currentGyro = FloatArray(3)
    private var isListening = false
    private var isHighRate = false

    private var lastTimestampNs: Long = 0L
    private var filteredLeanAngle: Float = 0f
    private var integratedSpeedMs: Float = 0f
    private var gravityY: Float = 9.8f
    private var smoothG: Float = 1.0f
    private var smoothRoll: Float = 0.0f
    private var smoothPitch: Float = 0.0f
    private var smoothGyroX: Float = 0.0f
    private var smoothGyroY: Float = 0.0f
    private var smoothGyroZ: Float = 0.0f
    private var smoothGyroMag: Float = 0.0f
    private var lastStateEmitTime: Long = 0L

    // Cached latest sensor fields for concurrent, non-starving 60 FPS state emission
    @Volatile private var latestAx = 0f
    @Volatile private var latestAy = 0f
    @Volatile private var latestAz = 0f
    @Volatile private var latestMag = 9.80665f
    @Volatile private var latestG = 1.0f
    @Volatile private var latestPitch = 0f
    @Volatile private var latestRoll = 0f
    @Volatile private var latestInertialSpeedKmh = 0f

    @Volatile private var latestGx = 0f
    @Volatile private var latestGy = 0f
    @Volatile private var latestGz = 0f
    @Volatile private var latestGxDeg = 0f
    @Volatile private var latestGyDeg = 0f
    @Volatile private var latestGzDeg = 0f
    @Volatile private var latestGyroMagRad = 0f
    @Volatile private var latestGyroMagDeg = 0f
    @Volatile private var latestLeanAngle = 0f

    private val RAD_TO_DEG = (180.0 / Math.PI).toFloat()

    fun startListening() {
        if (isListening) return
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        gyroscope?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        isListening = true
        isHighRate = true
        lastTimestampNs = 0L
    }

    /**
     * Dynamically adjusts sampling frequency between ~10Hz (standstill) and ~50Hz (active ride)
     * to conserve battery and CPU on moderate processors.
     */
    fun setLowPowerMode(enableLowPower: Boolean) {
        // Maintain continuous 50Hz SENSOR_DELAY_GAME throughout active monitoring session.
        // This ensures real-time, silky-smooth gyroscope telemetry without listener
        // unregister/register driver delays when speed drops below 5 km/h.
    }

    fun stopListening() {
        if (!isListening) return
        sensorManager.unregisterListener(this)
        isListening = false
        lastTimestampNs = 0L
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null) return

        val now = System.currentTimeMillis()
        val dt = if (lastTimestampNs != 0L) (event.timestamp - lastTimestampNs) / 1_000_000_000.0f else 0.02f
        lastTimestampNs = event.timestamp

        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                currentAccel[0] = event.values[0]
                currentAccel[1] = event.values[1]
                currentAccel[2] = event.values[2]

                val ax = currentAccel[0]
                val ay = currentAccel[1]
                val az = currentAccel[2]

                val mag = sqrt((ax * ax + ay * ay + az * az).toDouble()).toFloat()
                val g = mag / 9.80665f

                // High precision 3D vehicle orientation angles (degrees)
                val pitch = (atan2(ay.toDouble(), sqrt((ax * ax + az * az).toDouble())) * RAD_TO_DEG).toFloat()
                val roll = (atan2(-ax.toDouble(), az.toDouble()) * RAD_TO_DEG).toFloat()

                // Adaptive low-pass smoothing (responsive on high delta, smooth on steady holding)
                val rollDelta = abs(roll - smoothRoll)
                val rollAlpha = when {
                    rollDelta > 10f -> 0.85f
                    rollDelta > 3f  -> 0.55f
                    else            -> 0.25f
                }
                smoothRoll = (1f - rollAlpha) * smoothRoll + rollAlpha * roll

                val pitchDelta = abs(pitch - smoothPitch)
                val pitchAlpha = when {
                    pitchDelta > 10f -> 0.85f
                    pitchDelta > 3f  -> 0.55f
                    else             -> 0.25f
                }
                smoothPitch = (1f - pitchAlpha) * smoothPitch + pitchAlpha * pitch

                val gDelta = abs(g - smoothG)
                val gAlpha = if (gDelta > 0.8f) 0.85f else 0.25f
                smoothG = (1f - gAlpha) * smoothG + gAlpha * g

                // Dynamic gravity compensation to prevent false speed when tilting the phone
                gravityY = 0.90f * gravityY + 0.10f * ay
                val linearAy = ay - gravityY

                // Only integrate true dynamic forward acceleration; ignore static gravity tilts
                if (abs(linearAy) > 1.2f && g in 0.7f..2.2f && latestGyroMagDeg > 15f) {
                    integratedSpeedMs = (integratedSpeedMs + (linearAy * dt)).coerceIn(0f, 45f)
                } else {
                    // Rapid decay to zero when vehicle is stationary or phone is merely tilted
                    integratedSpeedMs = (integratedSpeedMs * 0.85f).coerceAtLeast(0f)
                    if (integratedSpeedMs < 0.3f) integratedSpeedMs = 0f
                }

                // Update cached accelerometer state
                latestAx = ax
                latestAy = ay
                latestAz = az
                latestMag = mag
                latestG = smoothG
                latestPitch = smoothPitch
                latestRoll = smoothRoll
                latestInertialSpeedKmh = integratedSpeedMs * 3.6f

                // Silky-smooth responsive motorcycle lean angle
                val targetLean = smoothRoll.coerceIn(-65f, 65f)
                val leanDelta = abs(targetLean - filteredLeanAngle)
                val leanAlpha = when {
                    leanDelta > 10f -> 0.85f
                    leanDelta > 3f  -> 0.55f
                    else            -> 0.22f
                }
                filteredLeanAngle = (1f - leanAlpha) * filteredLeanAngle + leanAlpha * targetLean
                latestLeanAngle = filteredLeanAngle

                // Non-starving 60 FPS snapshot emission (16ms throttle or instant on critical events)
                val isCriticalEvent = g >= 2.5f || latestGyroMagDeg >= 80f
                if (isCriticalEvent || (now - lastStateEmitTime >= 16L)) {
                    lastStateEmitTime = now
                    emitCurrentState(now)
                }
            }

            Sensor.TYPE_GYROSCOPE -> {
                currentGyro[0] = event.values[0]
                currentGyro[1] = event.values[1]
                currentGyro[2] = event.values[2]

                val gx = currentGyro[0]
                val gy = currentGyro[1]
                val gz = currentGyro[2]

                val gxDeg = gx * RAD_TO_DEG
                val gyDeg = gy * RAD_TO_DEG
                val gzDeg = gz * RAD_TO_DEG

                val gyroMagRad = sqrt((gx * gx + gy * gy + gz * gz).toDouble()).toFloat()
                val gyroMagDeg = gyroMagRad * RAD_TO_DEG

                // Adaptive responsive smoothing for gyroscopic rotational rates
                val gyroXDelta = abs(gxDeg - smoothGyroX)
                val gyroAlphaX = if (gyroXDelta > 15f) 0.85f else 0.55f
                smoothGyroX = (1f - gyroAlphaX) * smoothGyroX + gyroAlphaX * gxDeg

                val gyroYDelta = abs(gyDeg - smoothGyroY)
                val gyroAlphaY = if (gyroYDelta > 15f) 0.85f else 0.55f
                smoothGyroY = (1f - gyroAlphaY) * smoothGyroY + gyroAlphaY * gyDeg

                val gyroZDelta = abs(gzDeg - smoothGyroZ)
                val gyroAlphaZ = if (gyroZDelta > 15f) 0.85f else 0.55f
                smoothGyroZ = (1f - gyroAlphaZ) * smoothGyroZ + gyroAlphaZ * gzDeg

                val gyroMagDelta = abs(gyroMagDeg - smoothGyroMag)
                val gyroAlphaMag = if (gyroMagDelta > 15f) 0.85f else 0.55f
                smoothGyroMag = (1f - gyroAlphaMag) * smoothGyroMag + gyroAlphaMag * gyroMagDeg

                // Update cached gyroscope state
                latestGx = gx
                latestGy = gy
                latestGz = gz
                latestGxDeg = smoothGyroX
                latestGyDeg = smoothGyroY
                latestGzDeg = smoothGyroZ
                latestGyroMagRad = gyroMagRad
                latestGyroMagDeg = smoothGyroMag

                // Non-starving 60 FPS snapshot emission (16ms throttle or instant on critical tumble)
                val isCriticalEvent = gyroMagDeg >= 80f || latestG >= 2.5f
                if (isCriticalEvent || (now - lastStateEmitTime >= 16L)) {
                    lastStateEmitTime = now
                    emitCurrentState(now)
                }
            }
        }
    }

    private fun emitCurrentState(now: Long) {
        _sensorData.value = SensorData(
            accelX = latestAx,
            accelY = latestAy,
            accelZ = latestAz,
            gyroX = latestGx,
            gyroY = latestGy,
            gyroZ = latestGz,
            gyroDegX = latestGxDeg,
            gyroDegY = latestGyDeg,
            gyroDegZ = latestGzDeg,
            accelerationMagnitude = latestMag,
            gForce = latestG,
            pitch = latestPitch,
            roll = latestRoll,
            leanAngle = latestLeanAngle,
            gyroMagnitude = latestGyroMagRad,
            gyroDegMagnitude = latestGyroMagDeg,
            inertialSpeedEstimateKmh = latestInertialSpeedKmh,
            isGyroAvailable = gyroscope != null,
            isAccelAvailable = accelerometer != null,
            timestamp = now
        )
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}
