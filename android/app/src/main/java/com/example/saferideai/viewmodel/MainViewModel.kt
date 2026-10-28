package com.example.saferideai.viewmodel

import android.app.Application
import android.content.Intent
import android.location.Location
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.saferideai.data.UserManager
import com.example.saferideai.data.local.AlertEntity
import com.example.saferideai.data.local.AppDatabase
import com.example.saferideai.data.local.EmergencyContactEntity
import com.example.saferideai.data.local.TripEntity
import com.example.saferideai.data.local.UserEntity
import com.example.saferideai.data.repository.AuthRepository
import com.example.saferideai.location.LocationHelper
import com.example.saferideai.ml.AppState
import com.example.saferideai.ml.CrashDetectionModel
import com.example.saferideai.ml.HazardEvent
import com.example.saferideai.sensors.SensorData
import com.example.saferideai.sensors.SensorManagerHelper
import com.example.saferideai.services.EmergencyDispatcher
import com.example.saferideai.services.MonitoringService
import com.example.saferideai.services.VoiceAdasService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val context = application.applicationContext
    private val database = AppDatabase.getDatabase(context)
    val userManager = UserManager(context)

    val authRepository = AuthRepository(database, userManager)
    val currentUser: StateFlow<UserEntity?> = authRepository.currentUser
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val contactDao = database.emergencyContactDao()
    val userDao = database.userDao()
    val tripDao = database.tripDao()
    val alertDao = database.alertDao()

    val emergencyContacts: StateFlow<List<EmergencyContactEntity>> = contactDao.getAllContacts()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val allTrips: StateFlow<List<TripEntity>> = tripDao.getAllTrips()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val allAlerts: StateFlow<List<AlertEntity>> = alertDao.getAllAlerts()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    private val sensorHelper = SensorManagerHelper(context)
    private val locationHelper = LocationHelper(context)
    private val crashModel = CrashDetectionModel(context)
    val voiceAdas = VoiceAdasService(context)

    val sensorData: StateFlow<SensorData> = sensorHelper.sensorData
    val location: StateFlow<Location?> = locationHelper.currentLocation
    val appState: StateFlow<AppState> = crashModel.appState
    val safetyScore: StateFlow<Int> = crashModel.safetyScore
    val driverGrade: StateFlow<String> = crashModel.driverGrade
    val lastHazard: StateFlow<HazardEvent> = crashModel.lastHazard
    val hazardRationale: StateFlow<String> = crashModel.hazardRationale
    val aiMetrics = crashModel.aiMetrics
    val pipelineMode = crashModel.pipelineMode

    val isDarkTheme: StateFlow<Boolean?> = userManager.isDarkTheme
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val phonePlacementMode: StateFlow<String> = userManager.phonePlacementMode
        .stateIn(viewModelScope, SharingStarted.Eagerly, "AUTO")

    val sosCountdownSeconds: StateFlow<Int> = userManager.sosCountdownSeconds
        .stateIn(viewModelScope, SharingStarted.Eagerly, 10)

    val gyroSensitivity: StateFlow<String> = userManager.gyroSensitivity
        .stateIn(viewModelScope, SharingStarted.Eagerly, "BALANCED")

    val autoSmsEnabled: StateFlow<Boolean> = userManager.autoSmsEnabled
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val harshBrakesCount: StateFlow<Int> = crashModel.harshBrakesCount
    val sharpTurnsCount: StateFlow<Int> = crashModel.sharpTurnsCount
    val crashesCount: StateFlow<Int> = crashModel.crashesCount
    val fallsCount: StateFlow<Int> = crashModel.fallsCount

    private val _tripDuration = MutableStateFlow(0L)
    val tripDuration: StateFlow<Long> = _tripDuration.asStateFlow()

    private val _tripDistanceKm = MutableStateFlow(0.0f)
    val tripDistanceKm: StateFlow<Float> = _tripDistanceKm.asStateFlow()

    private val _maxSpeedKmh = MutableStateFlow(0.0f)
    val maxSpeedKmh: StateFlow<Float> = _maxSpeedKmh.asStateFlow()

    private val _isVoiceMuted = MutableStateFlow(false)
    val isVoiceMuted: StateFlow<Boolean> = _isVoiceMuted.asStateFlow()

    private var tripTimerJob: Job? = null
    private var lastLocation: Location? = null
    private var activeTripId: Long = 0L

    init {
        viewModelScope.launch {
            authRepository.initDefaultDataIfEmpty()
        }

        viewModelScope.launch {
            userManager.isVoiceMuted.collect { muted ->
                _isVoiceMuted.value = muted
                voiceAdas.isMuted = muted
            }
        }

        viewModelScope.launch {
            phonePlacementMode.collect { mode ->
                crashModel.phonePlacementMode = mode
            }
        }

        viewModelScope.launch {
            gyroSensitivity.collect { sens ->
                crashModel.gyroSensitivity = sens
            }
        }

        // Process incoming sensor telemetry against physics crash model
        viewModelScope.launch {
            sensorData.collect { values ->
                if (appState.value == AppState.MONITORING) {
                    val loc = location.value
                    val currentSpeed = if (loc != null && loc.hasSpeed()) {
                        val spd = loc.speed * 3.6f
                        if (spd >= 1.5f) spd else 0.0f
                    } else {
                        0.0f
                    }
                    crashModel.processSensorData(values, currentSpeed)
                }
            }
        }

        // Location tracking and cumulative trip distance (Haversine formula)
        viewModelScope.launch {
            location.collect { loc ->
                if (loc != null && appState.value == AppState.MONITORING) {
                    val speedKmh = loc.speed * 3.6f
                    if (speedKmh > _maxSpeedKmh.value) {
                        _maxSpeedKmh.value = speedKmh
                    }

                    // Dynamically elevate sensor sampling when vehicle is in motion (> 5 km/h)
                    sensorHelper.setLowPowerMode(speedKmh < 5.0f)

                    val prev = lastLocation
                    if (prev != null) {
                        val distMeters = haversineDistanceMeters(prev.latitude, prev.longitude, loc.latitude, loc.longitude)
                        if (distMeters in 2.0..2000.0) { // filter GPS jitter
                            _tripDistanceKm.value += (distMeters / 1000.0f)
                        }
                    }
                    lastLocation = loc
                }
            }
        }

        // Voice ADAS alerts and Alert History logging on detected hazard events
        viewModelScope.launch {
            lastHazard.collect { hazard ->
                when (hazard) {
                    HazardEvent.IMPACT -> {
                        voiceAdas.speak("Alert! Severe impact detected. Initiating SOS countdown.", isEmergency = true)
                        recordAlert("COLLISION / CRASH", hazardRationale.value.ifEmpty { "High-G collision impact detected" }, isSevere = true)
                    }
                    HazardEvent.FALL -> {
                        voiceAdas.speak("Alert! Motorcycle fall detected. Initiating emergency countdown.", isEmergency = true)
                        recordAlert("MOTORCYCLE FALL", hazardRationale.value.ifEmpty { "Motorcycle fall / gyroscopic tumble detected" }, isSevere = true)
                    }
                    HazardEvent.HARSH_BRAKE -> {
                        voiceAdas.speak("Warning: Sudden harsh braking.")
                        recordAlert("HARSH BRAKE", hazardRationale.value.ifEmpty { "Sudden harsh braking event" }, isSevere = false)
                    }
                    HazardEvent.SHARP_TURN -> {
                        voiceAdas.speak("Warning: Sharp turn detected.")
                        recordAlert("SHARP TURN", hazardRationale.value.ifEmpty { "High-speed sharp yaw turn" }, isSevere = false)
                    }
                    HazardEvent.EXTREME_LEAN -> {
                        voiceAdas.speak("Warning: Excessive bike lean angle.")
                        recordAlert("EXCESSIVE LEAN", hazardRationale.value.ifEmpty { "Dangerous motorcycle lean angle" }, isSevere = false)
                    }
                    HazardEvent.SPEEDING -> {
                        voiceAdas.speak("Warning: High speed.")
                        recordAlert("OVERSPEED", hazardRationale.value.ifEmpty { "Vehicle speed exceeds safe limit" }, isSevere = false)
                    }
                    HazardEvent.NONE -> {}
                }
            }
        }
    }

    private fun haversineDistanceMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Float {
        val r = 6371000.0 // Earth radius in meters
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return (r * c).toFloat()
    }

    fun startMonitoring() {
        if (appState.value == AppState.SAFE) {
            sensorHelper.startListening()
            try {
                locationHelper.startLocationUpdates()
            } catch (e: SecurityException) {}

            crashModel.startMonitoring()
            voiceAdas.speak("DivyaDrishti safety active. Safe ride monitoring engaged.")

            _tripDuration.value = 0L
            _tripDistanceKm.value = 0.0f
            _maxSpeedKmh.value = 0.0f
            lastLocation = null

            viewModelScope.launch {
                val newTrip = TripEntity(
                    startTime = System.currentTimeMillis(),
                    safetyScore = 100,
                    grade = "A+"
                )
                activeTripId = tripDao.insertTrip(newTrip)
            }

            tripTimerJob?.cancel()
            tripTimerJob = viewModelScope.launch {
                while (appState.value == AppState.MONITORING) {
                    delay(1000)
                    _tripDuration.value += 1
                }
            }

            val serviceIntent = Intent(context, MonitoringService::class.java).apply {
                action = MonitoringService.ACTION_START_MONITORING
            }
            ContextCompat.startForegroundService(context, serviceIntent)
        }
    }

    fun stopMonitoring() {
        sensorHelper.stopListening()
        locationHelper.stopLocationUpdates()
        crashModel.stopMonitoring()
        tripTimerJob?.cancel()

        viewModelScope.launch {
            if (activeTripId != 0L) {
                val durSec = _tripDuration.value.coerceAtLeast(1L)
                val avgSpd = (_tripDistanceKm.value / (durSec / 3600.0f)).coerceAtLeast(0f)
                val incidents = harshBrakesCount.value + sharpTurnsCount.value + crashesCount.value + fallsCount.value

                tripDao.updateTrip(
                    TripEntity(
                        id = activeTripId.toInt(),
                        startTime = System.currentTimeMillis() - (durSec * 1000),
                        endTime = System.currentTimeMillis(),
                        distanceKm = _tripDistanceKm.value,
                        maxSpeedKmh = _maxSpeedKmh.value,
                        avgSpeedKmh = avgSpd,
                        safetyScore = safetyScore.value,
                        grade = driverGrade.value,
                        incidentsCount = incidents,
                        isCompleted = true
                    )
                )
            }
        }

        val serviceIntent = Intent(context, MonitoringService::class.java).apply {
            action = MonitoringService.ACTION_STOP_MONITORING
        }
        context.startService(serviceIntent)
        voiceAdas.speak("Ride session completed.")
    }

    fun toggleVoiceMute() {
        val next = !_isVoiceMuted.value
        _isVoiceMuted.value = next
        voiceAdas.isMuted = next
        viewModelScope.launch {
            userManager.setVoiceMuted(next)
        }
    }

    fun resolveDanger() {
        crashModel.resolveDanger()
        voiceAdas.speak("Emergency SOS cancelled. Returning to monitoring.")
    }

    fun markSosSent() {
        crashModel.markSosSent()
    }

    /**
     * Persistently logs safety alerts and incidents into Room SQLite database.
     */
    fun recordAlert(eventType: String, rationale: String, isSevere: Boolean = true) {
        viewModelScope.launch(Dispatchers.IO) {
            val loc = location.value
            val lat = loc?.latitude ?: 0.0
            val lng = loc?.longitude ?: 0.0
            val spd = (loc?.speed ?: 0f) * 3.6f
            val sData = sensorData.value
            val contacts = contactDao.getContactList()
            val primary = contacts.firstOrNull { it.isPrimary }?.name ?: (contacts.firstOrNull()?.name ?: "Emergency Contacts")

            val alert = AlertEntity(
                eventType = eventType,
                severity = if (isSevere) "CRITICAL" else "WARNING",
                isSevere = isSevere,
                rationale = rationale,
                speedKmh = spd,
                gForce = sData.gForce,
                gyroDegS = sData.gyroDegMagnitude,
                lat = lat,
                lng = lng,
                primaryRecipient = primary,
                recipientsCount = contacts.size
            )
            alertDao.insertAlert(alert)
        }
    }

    fun deleteAlert(id: Int) {
        viewModelScope.launch {
            alertDao.deleteAlert(id)
        }
    }

    fun clearAllAlerts() {
        viewModelScope.launch {
            alertDao.clearAllAlerts()
        }
    }

    /**
     * Completely independent multi-channel emergency dispatch.
     * Automatically sends direct SMS to emergency contacts via cellular network.
     * Pulls the absolute freshest contacts directly from Room SQLite database.
     */
    fun dispatchEmergencySos(): String {
        val loc = location.value
        val lat = loc?.latitude ?: 0.0
        val lng = loc?.longitude ?: 0.0
        val spd = (loc?.speed ?: 0f) * 3.6f
        val rider = currentUser.value

        val message = EmergencyDispatcher.formatSosMessage(
            rider = rider,
            lat = lat,
            lng = lng,
            speedKmh = spd,
            hazardType = if (lastHazard.value == HazardEvent.FALL) "FALL / ROLLOVER" else "COLLISION / CRASH"
        )

        viewModelScope.launch(Dispatchers.IO) {
            val freshContacts = contactDao.getContactList().ifEmpty { emergencyContacts.value }
            val sentCount = if (autoSmsEnabled.value) {
                EmergencyDispatcher.dispatchDirectSms(context, freshContacts, message)
            } else 0

            recordAlert(
                eventType = "EMERGENCY SOS DISPATCH",
                rationale = "Dispatched SOS broadcast to ${freshContacts.size} contacts ($sentCount SMS dispatched)",
                isSevere = true
            )

            withContext(Dispatchers.Main) {
                voiceAdas.speak("Emergency alerts dispatched to $sentCount contacts.", isEmergency = true)
                markSosSent()
            }
        }
        return message
    }

    fun addEmergencyContact(name: String, phone: String, relationship: String, isPrimary: Boolean = false) {
        viewModelScope.launch {
            val count = contactDao.getCount()
            val shouldBePrimary = isPrimary || count == 0
            if (shouldBePrimary) {
                contactDao.clearPrimaryStatus()
            }
            contactDao.insertContact(
                EmergencyContactEntity(
                    name = name.trim(),
                    phoneNumber = phone.trim(),
                    relationship = relationship.trim().ifEmpty { "Family" },
                    isPrimary = shouldBePrimary
                )
            )
        }
    }

    fun updateEmergencyContact(id: Int, name: String, phone: String, relationship: String, isPrimary: Boolean) {
        viewModelScope.launch {
            if (isPrimary) {
                contactDao.clearPrimaryStatus()
            }
            contactDao.updateContact(
                EmergencyContactEntity(
                    id = id,
                    name = name.trim(),
                    phoneNumber = phone.trim(),
                    relationship = relationship.trim().ifEmpty { "Family" },
                    isPrimary = isPrimary
                )
            )
        }
    }

    fun setPrimaryEmergencyContact(id: Int) {
        viewModelScope.launch {
            contactDao.setPrimaryContact(id)
        }
    }

    fun deleteEmergencyContact(contactId: Int) {
        viewModelScope.launch {
            contactDao.deleteById(contactId)
            val remaining = contactDao.getContactList()
            if (remaining.isNotEmpty() && remaining.none { it.isPrimary }) {
                contactDao.setPrimary(remaining.first().id)
            }
        }
    }

    fun updateRiderProfile(name: String, phone: String, vehicle: String, blood: String, notes: String) {
        viewModelScope.launch {
            val user = userDao.getActiveUserDirect() ?: userDao.getFirstUser()
            if (user != null) {
                val updated = user.copy(
                    name = name.trim(),
                    phoneNumber = phone.trim(),
                    vehicleNumber = vehicle.trim(),
                    bloodGroup = blood.trim(),
                    medicalNotes = notes.trim(),
                    isLoggedIn = true
                )
                userDao.updateUser(updated)
                userManager.saveUserName(name.trim())
            }
        }
    }

    fun setPhonePlacementMode(mode: String) {
        viewModelScope.launch {
            userManager.setPhonePlacementMode(mode)
            crashModel.phonePlacementMode = mode
        }
    }

    fun setSosCountdownSeconds(sec: Int) {
        viewModelScope.launch {
            userManager.setSosCountdownSeconds(sec)
        }
    }

    fun setGyroSensitivity(sens: String) {
        viewModelScope.launch {
            userManager.setGyroSensitivity(sens)
            crashModel.gyroSensitivity = sens
        }
    }

    fun setAutoSmsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            userManager.setAutoSmsEnabled(enabled)
        }
    }

    fun toggleTheme(currentDark: Boolean) {
        viewModelScope.launch {
            userManager.setDarkTheme(!currentDark)
        }
    }

    // Interactive Demo Simulation Triggers
    fun simulateCrash() {
        startMonitoring()
        crashModel.simulateCrash()
    }

    fun simulateFall() {
        startMonitoring()
        crashModel.simulateFall()
    }

    fun simulateHarshBrake() {
        crashModel.simulateHarshBrake()
    }

    fun simulateSharpTurn() {
        crashModel.simulateSharpTurn()
    }

    fun simulateScenario(scenario: com.example.saferideai.ml.SimulationScenario) {
        startMonitoring()
        crashModel.simulateScenario(scenario)
    }

    fun setPipelineMode(mode: com.example.saferideai.ml.PipelineMode) {
        crashModel.aiPipeline.setMode(mode)
    }

    override fun onCleared() {
        super.onCleared()
        sensorHelper.stopListening()
        locationHelper.stopLocationUpdates()
        voiceAdas.shutdown()
        tripTimerJob?.cancel()
    }
}
