package com.example.saferideai

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.saferideai.ml.AppState
import com.example.saferideai.services.EmergencyDispatcher
import com.example.saferideai.ui.navigation.Screen
import com.example.saferideai.ui.screens.*
import com.example.saferideai.ui.theme.SafeRideAITheme
import com.example.saferideai.viewmodel.MainViewModel
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val viewModel: MainViewModel = viewModel()
            val userDarkPref by viewModel.isDarkTheme.collectAsState()
            val systemDark = androidx.compose.foundation.isSystemInDarkTheme()
            val isDark = userDarkPref ?: systemDark

            SafeRideAITheme(darkTheme = isDark) {
                SafeRideApp(viewModel = viewModel, isDarkTheme = isDark)
            }
        }
    }
}

@Composable
fun SafeRideApp(
    viewModel: MainViewModel = viewModel(),
    isDarkTheme: Boolean = true
) {
    val navController = rememberNavController()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val appState by viewModel.appState.collectAsState()
    val sensorData by viewModel.sensorData.collectAsState()
    val location by viewModel.location.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val userToken by viewModel.userManager.userToken.collectAsState(initial = null)
    val isLoggedIn by viewModel.userManager.isLoggedIn.collectAsState(initial = false)

    val allAlerts by viewModel.allAlerts.collectAsState()
    val allTrips by viewModel.allTrips.collectAsState()
    val phonePlacementMode by viewModel.phonePlacementMode.collectAsState()
    val sosCountdownSeconds by viewModel.sosCountdownSeconds.collectAsState()
    val gyroSensitivity by viewModel.gyroSensitivity.collectAsState()
    val autoSmsEnabled by viewModel.autoSmsEnabled.collectAsState()

    val aiMetrics by viewModel.aiMetrics.collectAsState()
    val pipelineMode by viewModel.pipelineMode.collectAsState()

    val safetyScore by viewModel.safetyScore.collectAsState()
    val maxSpeedKmh by viewModel.maxSpeedKmh.collectAsState()
    val currentSpeedKmh = if (location != null && location!!.hasSpeed()) {
        val spd = location!!.speed * 3.6f
        if (spd >= 1.5f) spd else 0.0f
    } else {
        0.0f
    }
    val driverGrade by viewModel.driverGrade.collectAsState()
    val tripDistanceKm by viewModel.tripDistanceKm.collectAsState()
    val tripDuration by viewModel.tripDuration.collectAsState()
    val isVoiceMuted by viewModel.isVoiceMuted.collectAsState()

    val harshBrakesCount by viewModel.harshBrakesCount.collectAsState()
    val sharpTurnsCount by viewModel.sharpTurnsCount.collectAsState()
    val crashesCount by viewModel.crashesCount.collectAsState()
    val fallsCount by viewModel.fallsCount.collectAsState()
    val emergencyContacts by viewModel.emergencyContacts.collectAsState()
    val hazardRationale by viewModel.hazardRationale.collectAsState()

    // Automatically navigate to Emergency Screen on Danger (cancel countdown window)
    LaunchedEffect(appState) {
        if (appState == AppState.DANGER) {
            navController.navigate(Screen.Emergency.route) {
                popUpTo(Screen.Dashboard.route) { inclusive = false }
            }
        }
    }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomNav = currentRoute in listOf(
        Screen.Dashboard.route,
        Screen.Map.route,
        Screen.History.route,
        Screen.Settings.route
    )

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                NavigationBar {
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Dashboard, contentDescription = "Home") },
                        label = { Text("Cockpit") },
                        selected = currentRoute == Screen.Dashboard.route,
                        onClick = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(navController.graph.startDestinationId)
                                launchSingleTop = true
                            }
                        }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.LocationOn, contentDescription = "Map") },
                        label = { Text("Map") },
                        selected = currentRoute == Screen.Map.route,
                        onClick = {
                            navController.navigate(Screen.Map.route) {
                                popUpTo(navController.graph.startDestinationId)
                                launchSingleTop = true
                            }
                        }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.History, contentDescription = "History") },
                        label = { Text("History") },
                        selected = currentRoute == Screen.History.route,
                        onClick = {
                            navController.navigate(Screen.History.route) {
                                popUpTo(navController.graph.startDestinationId)
                                launchSingleTop = true
                            }
                        }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                        label = { Text("Settings") },
                        selected = currentRoute == Screen.Settings.route,
                        onClick = {
                            navController.navigate(Screen.Settings.route) {
                                popUpTo(navController.graph.startDestinationId)
                                launchSingleTop = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Splash.route,
            modifier = if (currentRoute == Screen.Splash.route) Modifier else Modifier.padding(innerPadding),
            enterTransition = { fadeIn(animationSpec = tween(250)) },
            exitTransition = { fadeOut(animationSpec = tween(200)) },
            popEnterTransition = { fadeIn(animationSpec = tween(250)) },
            popExitTransition = { fadeOut(animationSpec = tween(200)) }
        ) {
            composable(Screen.Splash.route) {
                SplashScreen {
                    val targetScreen = if (isLoggedIn && !userToken.isNullOrBlank() && currentUser != null) {
                        Screen.Dashboard.route
                    } else {
                        Screen.Auth.route
                    }
                    navController.navigate(targetScreen) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            }

            composable(Screen.Auth.route) {
                AuthScreen(
                    onLoginSuccess = { token ->
                        scope.launch {
                            viewModel.userManager.saveToken("Bearer $token")
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Auth.route) { inclusive = true }
                            }
                        }
                    }
                )
            }

            composable(Screen.Onboarding.route) {
                OnboardingScreen {
                    navController.navigate(Screen.Permissions.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            }

            composable(Screen.Permissions.route) {
                PermissionsScreen {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Permissions.route) { inclusive = true }
                    }
                }
            }

            composable(Screen.Dashboard.route) {
                DashboardScreen(
                    appState = appState,
                    riderName = currentUser?.name ?: "Rider",
                    vehicleNumber = currentUser?.vehicleNumber?.ifEmpty { "Not Registered" } ?: "Not Registered",
                    safetyScore = safetyScore,
                    driverGrade = driverGrade,
                    speedKmh = currentSpeedKmh,
                    maxSpeedKmh = maxSpeedKmh,
                    gForce = sensorData.gForce,
                    pitch = sensorData.pitch,
                    roll = sensorData.roll,
                    leanAngle = sensorData.leanAngle,
                    gyroDegZ = sensorData.gyroDegZ,
                    gyroDegMagnitude = sensorData.gyroDegMagnitude,
                    tripDistanceKm = tripDistanceKm,
                    tripDurationSec = tripDuration,
                    isVoiceMuted = isVoiceMuted,
                    isDarkTheme = isDarkTheme,
                    aiMetrics = aiMetrics,
                    pipelineMode = pipelineMode,
                    harshBrakesCount = harshBrakesCount,
                    sharpTurnsCount = sharpTurnsCount,
                    crashesCount = crashesCount,
                    fallsCount = fallsCount,
                    onToggleTheme = { viewModel.toggleTheme(isDarkTheme) },
                    onToggleVoiceMute = { viewModel.toggleVoiceMute() },
                    onStartMonitoring = { viewModel.startMonitoring() },
                    onStopMonitoring = { viewModel.stopMonitoring() },
                    onEmergencySos = {
                        viewModel.startMonitoring()
                        navController.navigate(Screen.Emergency.route)
                    },
                    onNavigateMonitoring = {
                        navController.navigate("monitoring")
                    },
                    onSimulateScenario = { scenario -> viewModel.simulateScenario(scenario) },
                    onSetPipelineMode = { mode -> viewModel.setPipelineMode(mode) },
                    onSimulateCrash = { viewModel.simulateCrash() },
                    onSimulateFall = { viewModel.simulateFall() },
                    onSimulateSharpTurn = { viewModel.simulateSharpTurn() }
                )
            }

            composable("monitoring") {
                MonitoringScreen(
                    sensorData = sensorData,
                    speedKmh = currentSpeedKmh,
                    maxSpeedKmh = maxSpeedKmh,
                    appState = appState,
                    onBack = { navController.navigateUp() }
                )
            }

            composable(Screen.Emergency.route) {
                val primaryContact = emergencyContacts.firstOrNull { it.isPrimary }
                    ?: emergencyContacts.firstOrNull()
                val primaryPhone = primaryContact?.phoneNumber ?: "+918904791552"
                val primaryName = primaryContact?.name ?: "Emergency Family Contact"

                EmergencyScreen(
                    hazardRationale = hazardRationale.ifEmpty { "High-G collision or gyroscopic tumble detected" },
                    primaryPhone = primaryPhone,
                    primaryName = primaryName,
                    allContacts = emergencyContacts,
                    countdownDuration = sosCountdownSeconds,
                    onCancel = {
                        viewModel.resolveDanger()
                        navController.navigateUp()
                    },
                    onCallNow = {
                        val intent = EmergencyDispatcher.getCallContactIntent(primaryPhone)
                        try { context.startActivity(intent) } catch (e: Exception) {}
                    },
                    onWhatsAppSos = {
                        val lat = location?.latitude ?: 0.0
                        val lng = location?.longitude ?: 0.0
                        val spd = (location?.speed ?: 0f) * 3.6f
                        val msg = EmergencyDispatcher.formatSosMessage(currentUser, lat, lng, spd)
                        val intent = EmergencyDispatcher.getWhatsAppIntent(primaryPhone, msg)
                        try { context.startActivity(intent) } catch (e: Exception) {}
                    },
                    onLocateHospital = {
                        val lat = location?.latitude ?: 0.0
                        val lng = location?.longitude ?: 0.0
                        val intent = EmergencyDispatcher.getNearestHospitalIntent(lat, lng)
                        try { context.startActivity(intent) } catch (e: Exception) {}
                    },
                    onSosDispatched = {
                        viewModel.dispatchEmergencySos()
                    }
                )
            }

            composable(Screen.Map.route) {
                MapScreen(
                    location = location,
                    onBack = { navController.navigateUp() }
                )
            }

            composable(Screen.History.route) {
                HistoryScreen(
                    alerts = allAlerts,
                    trips = allTrips,
                    onDeleteAlert = { viewModel.deleteAlert(it) },
                    onClearAllAlerts = { viewModel.clearAllAlerts() },
                    onBack = { navController.navigateUp() }
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    rider = currentUser,
                    contacts = emergencyContacts,
                    isVoiceMuted = isVoiceMuted,
                    isDarkTheme = isDarkTheme,
                    phonePlacementMode = phonePlacementMode,
                    sosCountdownSeconds = sosCountdownSeconds,
                    gyroSensitivity = gyroSensitivity,
                    autoSmsEnabled = autoSmsEnabled,
                    onToggleTheme = { viewModel.toggleTheme(isDarkTheme) },
                    onToggleVoiceMute = { viewModel.toggleVoiceMute() },
                    onSetPhonePlacementMode = { viewModel.setPhonePlacementMode(it) },
                    onSetSosCountdownSeconds = { viewModel.setSosCountdownSeconds(it) },
                    onSetGyroSensitivity = { viewModel.setGyroSensitivity(it) },
                    onSetAutoSmsEnabled = { viewModel.setAutoSmsEnabled(it) },
                    onAddContact = { name, phone, rel, isPrimary ->
                        viewModel.addEmergencyContact(name, phone, rel, isPrimary)
                    },
                    onUpdateContact = { id, name, phone, rel, isPrimary ->
                        viewModel.updateEmergencyContact(id, name, phone, rel, isPrimary)
                    },
                    onSetPrimaryContact = { id ->
                        viewModel.setPrimaryEmergencyContact(id)
                    },
                    onDeleteContact = { id ->
                        viewModel.deleteEmergencyContact(id)
                    },
                    onUpdateProfile = { name, phone, vehicle, blood, notes ->
                        viewModel.updateRiderProfile(name, phone, vehicle, blood, notes)
                    },
                    onLogout = {
                        scope.launch {
                            viewModel.authRepository.logout()
                            navController.navigate(Screen.Auth.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    },
                    onBack = { navController.navigateUp() }
                )
            }
        }
    }
}
