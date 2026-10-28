package com.example.saferideai

import com.example.saferideai.data.local.EmergencyContactEntity
import com.example.saferideai.data.local.UserEntity
import com.example.saferideai.ml.AppState
import com.example.saferideai.ml.CrashDetectionModel
import com.example.saferideai.ml.HazardEvent
import com.example.saferideai.sensors.SensorData
import com.example.saferideai.services.EmergencyDispatcher
import com.example.saferideai.util.SecurityHelper
import org.junit.Assert.*
import org.junit.Test
import kotlin.math.atan2
import kotlin.math.sqrt

/**
 * DivyaDrishti Autonomous Mobile System Comprehensive Test Suite
 * Tests Traditional Authentication, Edge Sensor Fusion, Crash Detection,
 * Driver Safety Scoring, and Emergency Lifeline Dispatch.
 */
class DivyaDrishtiSystemTest {

    // =========================================================================
    // 1. TRADITIONAL AUTHENTICATION & SECURITY TESTS
    // =========================================================================
    @Test
    fun testTraditionalPasswordHashingAndVerification() {
        val rawPassword = "password123"
        val hash = SecurityHelper.hashPassword(rawPassword)

        assertNotNull(hash)
        assertTrue("Hash must be SHA-256 64-hex string", hash.length == 64)

        // Verify correct password matches
        assertTrue("Password verification must succeed for correct password",
            SecurityHelper.verifyPassword(rawPassword, hash))

        // Verify wrong password fails
        assertFalse("Password verification must fail for wrong password",
            SecurityHelper.verifyPassword("wrongPassword99", hash))

        // Verify case sensitivity
        assertFalse("Password verification must be case-sensitive",
            SecurityHelper.verifyPassword("Password123", hash))
    }

    @Test
    fun testAuthenticationInputValidation() {
        // Valid emails
        assertTrue(SecurityHelper.isValidEmail("sahana@divyadrishti.io"))
        assertTrue(SecurityHelper.isValidEmail("rider123@gmail.com"))

        // Invalid emails
        assertFalse(SecurityHelper.isValidEmail("invalid-email"))
        assertFalse(SecurityHelper.isValidEmail("test@"))

        // Password length check
        assertTrue(SecurityHelper.isValidPassword("secret12"))
        assertFalse(SecurityHelper.isValidPassword("12345"))
    }

    // =========================================================================
    // 2. SENSOR MATHEMATICS & 3D TILT ANGLE DERIVATION TESTS
    // =========================================================================
    @Test
    fun testSensorOrientationMath() {
        // Flat level position (stationary on table or bike mount)
        val axFlat = 0f
        val ayFlat = 0f
        val azFlat = 9.80665f
        val magFlat = sqrt((axFlat * axFlat + ayFlat * ayFlat + azFlat * azFlat).toDouble()).toFloat()
        val gFlat = magFlat / 9.80665f

        val pitchFlat = (atan2(ayFlat.toDouble(), sqrt((axFlat * axFlat + azFlat * azFlat).toDouble())) * (180.0 / Math.PI)).toFloat()
        val rollFlat = (atan2(-axFlat.toDouble(), azFlat.toDouble()) * (180.0 / Math.PI)).toFloat()

        assertEquals("Stationary G-force must equal ~1.0G", 1.0f, gFlat, 0.05f)
        assertEquals("Level pitch must equal ~0 deg", 0f, pitchFlat, 1.0f)
        assertEquals("Level roll must equal ~0 deg", 0f, rollFlat, 1.0f)

        // Extreme rollover tilt (Bike fallen on its right side: ax = 9.5, az = 1.8)
        val axFall = 9.5f
        val azFall = 1.8f
        val rollFall = (atan2(-axFall.toDouble(), azFall.toDouble()) * (180.0 / Math.PI)).toFloat()

        assertTrue("Rollover tilt must exceed 65 degrees threshold", Math.abs(rollFall) > 65.0f)
    }

    // =========================================================================
    // 3. ZERO-LATENCY CRASH & ACCIDENT DETECTION TESTS
    // =========================================================================
    @Test
    fun testCrashDetectionHighGCollision() {
        val model = CrashDetectionModel()
        model.startMonitoring()
        assertEquals(AppState.MONITORING, model.appState.value)

        // 1. Normal riding telemetry (1.05G, 3 deg tilt) -> Safe
        val normalData = SensorData(
            accelX = 0.2f, accelY = 0.5f, accelZ = 9.8f,
            accelerationMagnitude = 9.85f, gForce = 1.05f,
            pitch = 2.0f, roll = 3.0f, gyroMagnitude = 0.2f
        )
        model.processSensorData(normalData, speedKmh = 45.0f)
        assertEquals(AppState.MONITORING, model.appState.value)
        assertEquals(HazardEvent.NONE, model.lastHazard.value)

        // 2. High-G impact collision shock: 5.2G (> 4.5G crash threshold)
        val crashData = SensorData(
            accelX = 12.0f, accelY = -48.0f, accelZ = 15.0f,
            accelerationMagnitude = 51.0f, gForce = 5.2f,
            pitch = 25.0f, roll = 10.0f, gyroMagnitude = 4.0f
        )
        model.processSensorData(crashData, speedKmh = 45.0f)

        assertEquals("High-G impact must trigger DANGER state immediately", AppState.DANGER, model.appState.value)
        assertEquals(HazardEvent.IMPACT, model.lastHazard.value)
        assertTrue(model.crashesCount.value >= 1)
    }

    @Test
    fun testCrashDetectionMotorcycleRolloverFall() {
        val model = CrashDetectionModel()
        model.startMonitoring()

        // Rollover: Roll tilt = 74.0 degrees (> 60 deg threshold) with active riding speed (25 km/h) & gyro tumble rate (95 deg/s)
        val fallData = SensorData(
            accelX = 9.2f, accelY = 1.0f, accelZ = 2.5f,
            accelerationMagnitude = 9.8f, gForce = 1.0f,
            pitch = 5.0f, roll = 74.0f, gyroMagnitude = 1.5f,
            gyroDegMagnitude = 95.0f
        )
        model.processSensorData(fallData, speedKmh = 25.0f)

        assertEquals("Motorcycle tilt > 60 deg with speed & gyro tumble must trigger DANGER state", AppState.DANGER, model.appState.value)
        assertEquals(HazardEvent.FALL, model.lastHazard.value)
        assertTrue(model.fallsCount.value >= 1)
    }

    @Test
    fun testStationaryPhoneTiltDoesNotTriggerSos() {
        val model = CrashDetectionModel()
        model.startMonitoring()

        // Handheld static tilt: Phone tilted 75° while stationary (0 km/h) and gentle hand gyro (18 deg/s)
        val staticTiltData = SensorData(
            accelX = 9.4f, accelY = 0.5f, accelZ = 2.1f,
            accelerationMagnitude = 9.8f, gForce = 1.0f,
            pitch = 8.0f, roll = 75.0f, leanAngle = 75.0f,
            gyroDegMagnitude = 18.0f
        )
        model.processSensorData(staticTiltData, speedKmh = 0.0f)

        assertEquals("Stationary handheld tilt must NEVER trigger DANGER or SOS", AppState.MONITORING, model.appState.value)
        assertEquals(HazardEvent.NONE, model.lastHazard.value)
        assertEquals(0, model.fallsCount.value)
        assertEquals(0, model.crashesCount.value)
    }

    @Test
    fun testGyroscopeRotationalTumbleAndLean() {
        val model = CrashDetectionModel()
        model.startMonitoring()

        // Gyroscope extreme spin/tumble: 310 deg/s rotational rate (> 280 deg/s threshold) with high roll tilt (50 deg)
        val tumbleData = SensorData(
            accelX = 1.0f, accelY = 1.0f, accelZ = 9.8f,
            accelerationMagnitude = 9.9f, gForce = 1.01f,
            roll = 50.0f, pitch = 15.0f,
            gyroDegMagnitude = 310.0f
        )
        model.processSensorData(tumbleData, speedKmh = 40.0f)
        assertEquals("Violent gyro tumble must trigger DANGER state", AppState.DANGER, model.appState.value)
        assertEquals(HazardEvent.FALL, model.lastHazard.value)

        // Reset and test high-speed sharp cornering yaw rate
        model.resolveDanger()
        val corneringData = SensorData(
            accelX = 2.0f, accelY = 0.5f, accelZ = 9.8f,
            gyroDegZ = 125.0f // 125 deg/s yaw rate at 35 km/h
        )
        model.processSensorData(corneringData, speedKmh = 35.0f)
        assertEquals("High-speed yaw cornering must trigger SHARP_TURN hazard", HazardEvent.SHARP_TURN, model.lastHazard.value)
    }

    @Test
    fun testSpeedometerDynamicCrashTrigger() {
        val model = CrashDetectionModel()
        model.startMonitoring()

        // 3.6G shock while vehicle speedometer reads 32 km/h
        val speedCrashData = SensorData(
            accelX = 5.0f, accelY = -34.0f, accelZ = 8.0f,
            accelerationMagnitude = 35.3f, gForce = 3.6f
        )
        model.processSensorData(speedCrashData, speedKmh = 32.0f)
        assertEquals("Speed-confirmed impact must trigger DANGER state", AppState.DANGER, model.appState.value)
        assertEquals(HazardEvent.IMPACT, model.lastHazard.value)
        assertTrue(model.hazardRationale.value.contains("32 km/h"))
    }

    // =========================================================================
    // 4. DRIVER SAFETY SCORE ENGINE (0-100) TESTS
    // =========================================================================
    @Test
    fun testDriverSafetyScoreCalculations() {
        val model = CrashDetectionModel()
        model.resetSession()

        // Baseline score
        assertEquals(100, model.safetyScore.value)
        assertEquals("A+", model.driverGrade.value)

        // Simulate harsh brake (-10)
        model.simulateHarshBrake()
        assertEquals(90, model.safetyScore.value)
        assertEquals("A+", model.driverGrade.value)

        // Simulate crash (-40)
        model.simulateCrash()
        assertEquals(50, model.safetyScore.value)
        assertEquals("D", model.driverGrade.value)

        // Check bounds (score cannot drop below 0)
        model.simulateCrash()
        model.simulateCrash()
        assertTrue("Safety score must not drop below 0", model.safetyScore.value >= 0)
    }

    // =========================================================================
    // 5. EMERGENCY SOS MESSAGE & 1-CLICK DEEP LINK TESTS
    // =========================================================================
    @Test
    fun testEmergencySosFormatting() {
        val demoRider = UserEntity(
            id = "RIDER_01",
            username = "sahana",
            email = "sahana@divyadrishti.io",
            passwordHash = "hash",
            name = "Sahana",
            phoneNumber = "+91 9876543210",
            bloodGroup = "O+",
            vehicleNumber = "KA 28 HM 8281",
            medicalNotes = "No allergies"
        )

        val message = EmergencyDispatcher.formatSosMessage(
            rider = demoRider,
            lat = 15.431800,
            lng = 76.531200,
            speedKmh = 42.0f,
            hazardType = "IMPACT CRASH"
        )

        assertTrue("Message must contain Rider name", message.contains("Sahana"))
        assertTrue("Message must contain Vehicle Reg", message.contains("KA 28 HM 8281"))
        assertTrue("Message must contain Blood Group", message.contains("O+"))
        assertTrue("Message must contain GPS coordinates", message.contains("15.431800,76.531200"))
        assertTrue("Message must contain Google Maps link", message.contains("https://maps.google.com/?q="))
    }

    @Test
    fun testWhatsAppAndHospitalIntents() {
        val urlWa = EmergencyDispatcher.getWhatsAppSosUrl("+918904791552", "TEST EMERGENCY ALERT")
        assertNotNull(urlWa)
        assertTrue(urlWa.contains("api.whatsapp.com/send"))
        assertTrue(urlWa.contains("phone=918904791552"))
        assertTrue(urlWa.contains("text=TEST+EMERGENCY+ALERT"))

        val geoUri = EmergencyDispatcher.getNearestHospitalGeoUri(15.4318, 76.5312)
        assertNotNull(geoUri)
        assertEquals("geo:15.4318,76.5312?q=hospital+emergency+room", geoUri)
    }

    @Test
    fun testEmergencyContactPhoneNormalization() {
        // Test standard 10-digit Indian mobile number without country code gets normalized to 91... for WhatsApp
        val urlWa10Digit = EmergencyDispatcher.getWhatsAppSosUrl("8904791552", "TEST")
        assertTrue(urlWa10Digit.contains("phone=918904791552"))

        // Test number with formatting "+91 89047 91552"
        val urlWaFormatted = EmergencyDispatcher.getWhatsAppSosUrl("+91 89047 91552", "TEST")
        assertTrue(urlWaFormatted.contains("phone=918904791552"))
    }

    // =========================================================================
    // 6. AUTONOMOUS EDGE AI PIPELINE & MULTI-SCENARIO SIMULATION TESTS
    // =========================================================================
    @Test
    fun testEdgeAiPipelineAutonomousInferenceAndSimulation() {
        val ai = com.example.saferideai.ml.AiPipelineEngine()

        // 1. Normal riding data
        val normalData = SensorData(
            accelX = 0.2f, accelY = 0.4f, accelZ = 9.8f,
            accelerationMagnitude = 9.81f, gForce = 1.0f,
            pitch = 2.0f, roll = 1.0f, leanAngle = 2.0f,
            gyroDegMagnitude = 12.0f,
            timestamp = System.currentTimeMillis()
        )
        val normalMetrics = ai.processFrame(normalData, speedKmh = 40.0f)
        assertEquals(com.example.saferideai.ml.ThreatLevel.NORMAL, normalMetrics.threatLevel)
        assertTrue("Normal ride must have low crash risk (< 30%)", normalMetrics.riskPercentage < 30)

        // 2. High-G Collision Crash Simulation
        val crashMetrics = ai.injectSimulation(com.example.saferideai.ml.SimulationScenario.CRASH_5G)
        assertEquals(com.example.saferideai.ml.ThreatLevel.CRITICAL, crashMetrics.threatLevel)
        assertEquals(HazardEvent.IMPACT, crashMetrics.activeHazard)
        assertTrue("5.2G collision must trigger > 75% crash probability", crashMetrics.crashProbability > 0.75f)

        // 3. Rollover Fall Simulation
        val fallMetrics = ai.injectSimulation(com.example.saferideai.ml.SimulationScenario.ROLLOVER_FALL)
        assertEquals(com.example.saferideai.ml.ThreatLevel.CRITICAL, fallMetrics.threatLevel)
        assertEquals(HazardEvent.FALL, fallMetrics.activeHazard)

        // 4. Harsh Brake Simulation
        val brakeMetrics = ai.injectSimulation(com.example.saferideai.ml.SimulationScenario.HARSH_BRAKE)
        assertEquals(com.example.saferideai.ml.ThreatLevel.CAUTION, brakeMetrics.threatLevel)
        assertEquals(HazardEvent.HARSH_BRAKE, brakeMetrics.activeHazard)
    }

    // =========================================================================
    // 7. REAL-WORLD POCKET & BIOMECHANICAL GYROSCOPE KINEMATICS TESTS
    // =========================================================================
    @Test
    fun testPocketGyroscopeFallTriggersSos() {
        val model = CrashDetectionModel()
        model.startMonitoring()
        model.phonePlacementMode = "PANT_POCKET"

        // 1. Initial seated reading
        val seatedData = SensorData(
            accelX = 1.0f, accelY = 8.8f, accelZ = 3.5f,
            accelerationMagnitude = 9.8f, gForce = 1.0f,
            pitch = 68.0f, roll = 10.0f, leanAngle = 10.0f,
            gyroDegMagnitude = 18.0f,
            timestamp = System.currentTimeMillis()
        )
        model.processSensorData(seatedData, speedKmh = 35.0f)
        assertEquals("Normal seated riding must remain SAFE/MONITORING", AppState.MONITORING, model.appState.value)

        // 2. Real crash: Violent body tumble & slide detected via gyroscope (160 deg/s, 2.2G shock at 30 km/h)
        val tumbleCrashData = SensorData(
            accelX = 8.5f, accelY = 14.2f, accelZ = 12.0f,
            accelerationMagnitude = 21.5f, gForce = 2.2f,
            pitch = 20.0f, roll = 75.0f, leanAngle = 75.0f,
            gyroDegMagnitude = 160.0f,
            timestamp = System.currentTimeMillis() + 40
        )
        model.processSensorData(tumbleCrashData, speedKmh = 30.0f)

        assertEquals("Pocket gyroscopic tumble must generate SOS Danger", AppState.DANGER, model.appState.value)
        assertEquals("Hazard must be FALL", HazardEvent.FALL, model.lastHazard.value)
        assertTrue("Rationale must mention gyroscopic dynamics", model.hazardRationale.value.contains("gyroscopic") || model.hazardRationale.value.contains("tumble") || model.hazardRationale.value.contains("fall"))
    }

    @Test
    fun testPantPocketSeatedPostureNormalRidingDoesNotTriggerSos() {
        val model = CrashDetectionModel()
        model.startMonitoring()
        model.phonePlacementMode = "PANT_POCKET"

        // Rider seated on bike with phone tilted at 70° (natural thigh angle) riding smoothly at 45 km/h
        val normalSeatedRiding = SensorData(
            accelX = 0.5f, accelY = 9.0f, accelZ = 3.2f,
            accelerationMagnitude = 9.9f, gForce = 1.01f,
            pitch = 70.0f, roll = 5.0f, leanAngle = 5.0f,
            gyroDegMagnitude = 16.0f,
            timestamp = System.currentTimeMillis()
        )
        model.processSensorData(normalSeatedRiding, speedKmh = 45.0f)

        assertEquals("Natural seated 70° phone posture in pant pocket must NOT trigger SOS", AppState.MONITORING, model.appState.value)
        assertEquals(HazardEvent.NONE, model.lastHazard.value)
    }

    @Test
    fun testWalkingWithPhoneInPocketDoesNotTriggerSos() {
        val model = CrashDetectionModel()
        model.startMonitoring()
        model.phonePlacementMode = "PANT_POCKET"

        // Walking cadence: speed 4 km/h, gyro ~45°/s, g-force 1.2G
        val walkingData = SensorData(
            accelX = 2.0f, accelY = 7.0f, accelZ = 6.0f,
            accelerationMagnitude = 11.5f, gForce = 1.18f,
            pitch = 55.0f, roll = 15.0f, leanAngle = 15.0f,
            gyroDegMagnitude = 45.0f,
            timestamp = System.currentTimeMillis()
        )
        model.processSensorData(walkingData, speedKmh = 4.2f)

        assertEquals("Walking cadence must remain in MONITORING", AppState.MONITORING, model.appState.value)
        assertEquals(HazardEvent.NONE, model.lastHazard.value)
    }

    @Test
    fun testAlertEntityProperties() {
        val alert = com.example.saferideai.data.local.AlertEntity(
            eventType = "MOTORCYCLE FALL",
            severity = "CRITICAL",
            rationale = "Pocket gyroscopic tumble detected",
            speedKmh = 32.0f,
            gForce = 2.3f,
            gyroDegS = 145.0f,
            lat = 15.4318,
            lng = 76.5312,
            primaryRecipient = "Emergency Contact (Home)",
            recipientsCount = 2
        )

        assertEquals("MOTORCYCLE FALL", alert.eventType)
        assertEquals("CRITICAL", alert.severity)
        assertTrue(alert.isSevere)
        assertEquals(32.0f, alert.speedKmh, 0.1f)
        assertEquals(2.3f, alert.gForce, 0.1f)
        assertEquals(145.0f, alert.gyroDegS, 0.1f)
        assertEquals(2, alert.recipientsCount)
    }
}
