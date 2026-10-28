package com.example.saferideai.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saferideai.ml.*
import com.example.saferideai.ui.theme.*
import kotlin.math.abs

@Composable
fun DashboardScreen(
    appState: AppState,
    riderName: String = "Sahana",
    vehicleNumber: String = "KA 28 HM 8281",
    safetyScore: Int = 100,
    driverGrade: String = "A+",
    speedKmh: Float = 0.0f,
    maxSpeedKmh: Float = 0.0f,
    gForce: Float = 1.0f,
    pitch: Float = 0.0f,
    roll: Float = 0.0f,
    leanAngle: Float = 0.0f,
    gyroDegZ: Float = 0.0f,
    gyroDegMagnitude: Float = 0.0f,
    tripDistanceKm: Float = 0.0f,
    tripDurationSec: Long = 0L,
    isVoiceMuted: Boolean = false,
    isDarkTheme: Boolean = true,
    aiMetrics: AiPipelineMetrics = AiPipelineMetrics(),
    pipelineMode: PipelineMode = PipelineMode.LIVE_SENSORS,
    harshBrakesCount: Int = 0,
    sharpTurnsCount: Int = 0,
    crashesCount: Int = 0,
    fallsCount: Int = 0,
    onToggleTheme: () -> Unit = {},
    onToggleVoiceMute: () -> Unit = {},
    onStartMonitoring: () -> Unit = {},
    onStopMonitoring: () -> Unit = {},
    onEmergencySos: () -> Unit = {},
    onNavigateMonitoring: () -> Unit = {},
    onSimulateScenario: (SimulationScenario) -> Unit = {},
    onSetPipelineMode: (PipelineMode) -> Unit = {},
    onSimulateCrash: () -> Unit = {},
    onSimulateFall: () -> Unit = {},
    onSimulateSharpTurn: () -> Unit = {}
) {
    val haptic = LocalHapticFeedback.current
    val isMonitoring = appState == AppState.MONITORING || appState == AppState.DANGER

    // Silky-smooth spring physics interpolation for realistic, fluid instrument cluster needles
    val animatedSpeed by animateFloatAsState(
        targetValue = speedKmh,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "speed"
    )
    val animatedLean by animateFloatAsState(
        targetValue = leanAngle,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "lean"
    )
    val animatedGForce by animateFloatAsState(
        targetValue = gForce,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "gForce"
    )
    val animatedRisk by animateFloatAsState(
        targetValue = aiMetrics.riskPercentage.toFloat(),
        animationSpec = tween(durationMillis = 350, easing = FastOutSlowInEasing),
        label = "risk"
    )
    val animatedScore by animateFloatAsState(
        targetValue = safetyScore.toFloat(),
        animationSpec = tween(durationMillis = 400, easing = FastOutSlowInEasing),
        label = "score"
    )

    val durationMin = tripDurationSec / 60
    val durationRemSec = tripDurationSec % 60
    val durationFormatted = String.format("%02d:%02d", durationMin, durationRemSec)

    var showSimLab by remember { mutableStateOf(pipelineMode == PipelineMode.SIMULATION) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // 1. TOP HEADER: Rider Welcome, Theme Toggle & Voice Mute Pill
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                androidx.compose.foundation.Image(
                    painter = androidx.compose.ui.res.painterResource(id = com.example.saferideai.R.drawable.app_logo),
                    contentDescription = "App Logo",
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(11.dp))
                        .border(1.dp, PrimaryCyan.copy(alpha = 0.5f), RoundedCornerShape(11.dp))
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Hello, $riderName",
                            color = MaterialTheme.colorScheme.onBackground,
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Black
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (isMonitoring) SafeGreen else Color(0xFF9CA3AF))
                        )
                    }
                    Text(
                        text = vehicleNumber,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.sp
                    )
                }
            }

            // Action Pills: Theme Switcher & Voice ADAS Toggle
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // Theme Switcher Button (☀️ / 🌙)
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier.clickable {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onToggleTheme()
                    }
                ) {
                    Box(modifier = Modifier.padding(8.dp)) {
                        Icon(
                            imageVector = if (isDarkTheme) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Toggle Theme",
                            tint = if (isDarkTheme) Color(0xFFFBBF24) else Color(0xFF6366F1),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                // Voice ADAS Mute Button
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier.clickable {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onToggleVoiceMute()
                    }
                ) {
                    Box(modifier = Modifier.padding(8.dp)) {
                        Icon(
                            imageVector = if (isVoiceMuted) Icons.AutoMirrored.Filled.VolumeOff else Icons.AutoMirrored.Filled.VolumeUp,
                            contentDescription = "Voice ADAS Mute",
                            tint = if (isVoiceMuted) DangerRed else PrimaryCyan,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 2. ACTIVE SYSTEM STATUS BANNER
        Surface(
            color = when (appState) {
                AppState.SAFE -> MaterialTheme.colorScheme.surface
                AppState.MONITORING -> MaterialTheme.colorScheme.surface
                AppState.DANGER -> Color(0x33EF4444)
                AppState.SOS_SENT -> Color(0x33DC2626)
            },
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(
                1.dp,
                when (appState) {
                    AppState.SAFE -> MaterialTheme.colorScheme.outline
                    AppState.MONITORING -> PrimaryCyan
                    AppState.DANGER -> DangerRed
                    AppState.SOS_SENT -> SosRed
                }
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(
                                when (appState) {
                                    AppState.SAFE -> Color(0xFF9CA3AF)
                                    AppState.MONITORING -> SafeGreen
                                    AppState.DANGER -> DangerRed
                                    AppState.SOS_SENT -> SosRed
                                }
                            )
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = when (appState) {
                                AppState.SAFE -> "STANDBY • READY TO RIDE"
                                AppState.MONITORING -> "AUTONOMOUS SAFETY ACTIVE"
                                AppState.DANGER -> "CRASH DETECTED • LIFELINE READY"
                                AppState.SOS_SENT -> "SOS DISPATCHED TO CONTACTS"
                            },
                            color = MaterialTheme.colorScheme.onBackground,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp
                        )
                        Text(
                            text = if (isMonitoring) "Sensor-Fusion AI: 50Hz continuous" else "Tap Start Monitoring to begin",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp
                        )
                    }
                }

                Surface(
                    color = if (isMonitoring) Color(0x2210B981) else Color(0x226B7280),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = if (isMonitoring) "ACTIVE" else "IDLE",
                        color = if (isMonitoring) SafeGreen else Color(0xFF9CA3AF),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 3. HERO INSTRUMENT CLUSTER (Speedometer & Lean Angle Gauges)
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "INSTRUMENT CLUSTER",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp
                    )
                    Surface(
                        color = PrimaryCyan.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, PrimaryCyan.copy(alpha = 0.4f)),
                        modifier = Modifier.clickable {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onNavigateMonitoring()
                        }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(if (isMonitoring) SafeGreen else Color(0xFF9CA3AF))
                            )
                            Spacer(modifier = Modifier.width(5.dp))
                            Text(
                                text = "GNSS + 6-DOF IMU ↗",
                                color = PrimaryCyan,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Gauge 1: Speedometer
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "SPEEDOMETER",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${animatedSpeed.toInt()}",
                                color = when {
                                    animatedSpeed > 80f -> DangerRed
                                    animatedSpeed > 50f -> MonitoringYellow
                                    else -> MaterialTheme.colorScheme.onBackground
                                },
                                fontSize = 42.sp,
                                fontWeight = FontWeight.Black,
                                lineHeight = 46.sp
                            )
                            Text(
                                text = "KM / H",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            // Speed Progress Line
                            LinearProgressIndicator(
                                progress = { (animatedSpeed / 120f).coerceIn(0f, 1f) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp)),
                                color = when {
                                    animatedSpeed > 80f -> DangerRed
                                    animatedSpeed > 50f -> MonitoringYellow
                                    else -> PrimaryCyan
                                },
                                trackColor = MaterialTheme.colorScheme.outline
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Peak: ${maxSpeedKmh.toInt()} km/h",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // Gauge 2: Motorcycle Lean Angle
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "MOTORCYCLE LEAN",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${abs(animatedLean).toInt()}°",
                                color = when {
                                    abs(animatedLean) > 48f -> DangerRed
                                    abs(animatedLean) > 35f -> MonitoringYellow
                                    else -> MaterialTheme.colorScheme.onBackground
                                },
                                fontSize = 42.sp,
                                fontWeight = FontWeight.Black,
                                lineHeight = 46.sp
                            )
                            Text(
                                text = when {
                                    animatedLean > 5f -> "LEAN RIGHT"
                                    animatedLean < -5f -> "LEAN LEFT"
                                    else -> "UPRIGHT CENTER"
                                },
                                color = when {
                                    abs(animatedLean) > 48f -> DangerRed
                                    abs(animatedLean) > 35f -> MonitoringYellow
                                    else -> SafeGreen
                                },
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            // Dual-sided Lean Horizon Bar
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(MaterialTheme.colorScheme.outline)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth((abs(animatedLean) / 60f).coerceIn(0f, 1f))
                                        .fillMaxHeight()
                                        .align(if (animatedLean >= 0) Alignment.CenterStart else Alignment.CenterEnd)
                                        .background(if (abs(animatedLean) > 48f) DangerRed else PrimaryCyan)
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "G-Force: ${String.format("%.2f", animatedGForce)}G • Gyro: ${gyroDegMagnitude.toInt()}°/s",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Real-Time 6-DOF Gyroscope Dynamic Telemetry Strip (60 FPS fluid telemetry)
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, PrimaryCyan.copy(alpha = 0.25f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onNavigateMonitoring()
                        }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 9.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Explore,
                                contentDescription = "Gyro Dynamics",
                                tint = PrimaryCyan,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(7.dp))
                            Column {
                                Text(
                                    text = "LIVE GYROSCOPE DYNAMICS",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.8.sp
                                )
                                Text(
                                    text = if (isMonitoring) "60 FPS Continuous Fused Stream" else "Ready • Tap for Diagnostics",
                                    color = if (isMonitoring) SafeGreen else MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 10.sp
                                )
                            }
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                color = MaterialTheme.colorScheme.background,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "Yaw: ${gyroDegZ.toInt()}°/s",
                                    color = if (abs(gyroDegZ) > 80f) DangerRed else MaterialTheme.colorScheme.onBackground,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                )
                            }
                            Surface(
                                color = MaterialTheme.colorScheme.background,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "Rate: ${gyroDegMagnitude.toInt()}°/s",
                                    color = if (gyroDegMagnitude > 100f) DangerRed else PrimaryCyan,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = FontFamily.Monospace,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 4. AUTONOMOUS EDGE AI PIPELINE MONITOR
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                // Header with Threat Level Badge
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "EDGE AI PIPELINE",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp
                        )
                        Text(
                            text = "Multi-Model Risk Engine",
                            color = MaterialTheme.colorScheme.onBackground,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Threat Level Badge
                    Surface(
                        color = when (aiMetrics.threatLevel) {
                            ThreatLevel.NORMAL -> Color(0x2210B981)
                            ThreatLevel.CAUTION -> Color(0x22F59E0B)
                            ThreatLevel.WARNING -> Color(0x33EF4444)
                            ThreatLevel.CRITICAL -> Color(0x44EF4444)
                        },
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(
                            1.dp,
                            when (aiMetrics.threatLevel) {
                                ThreatLevel.NORMAL -> SafeGreen
                                ThreatLevel.CAUTION -> MonitoringYellow
                                ThreatLevel.WARNING -> DangerRed
                                ThreatLevel.CRITICAL -> DangerRed
                            }
                        )
                    ) {
                        Text(
                            text = aiMetrics.threatLevel.label,
                            color = when (aiMetrics.threatLevel) {
                                ThreatLevel.NORMAL -> SafeGreen
                                ThreatLevel.CAUTION -> MonitoringYellow
                                ThreatLevel.WARNING -> DangerRed
                                ThreatLevel.CRITICAL -> DangerRed
                            },
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Continuous Crash Probability Progress Track
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Real-Time Crash Probability",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "${animatedRisk.toInt()}% Risk",
                        color = when {
                            animatedRisk > 70f -> DangerRed
                            animatedRisk > 30f -> MonitoringYellow
                            else -> SafeGreen
                        },
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                LinearProgressIndicator(
                    progress = { (animatedRisk / 100f).coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = when {
                        animatedRisk > 70f -> DangerRed
                        animatedRisk > 30f -> MonitoringYellow
                        else -> SafeGreen
                    },
                    trackColor = MaterialTheme.colorScheme.outline
                )

                Spacer(modifier = Modifier.height(14.dp))

                // 4-Quadrant AI Feature Matrix
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    AiFeatureChip(
                        label = "Peak Shock",
                        value = "${String.format("%.1f", aiMetrics.peakG)}G",
                        modifier = Modifier.weight(1f)
                    )
                    AiFeatureChip(
                        label = "Kinetic Jerk",
                        value = "${aiMetrics.jerk.toInt()} G/s",
                        modifier = Modifier.weight(1f)
                    )
                    AiFeatureChip(
                        label = "Angular RMS",
                        value = "${aiMetrics.gyroRmsDeg.toInt()}°/s",
                        modifier = Modifier.weight(1f)
                    )
                    AiFeatureChip(
                        label = "AI Latency",
                        value = "${String.format("%.2f", aiMetrics.inferenceTimeMs)}ms",
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Real-time AI Rationale Text
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoGraph,
                            contentDescription = "AI Rationale",
                            tint = PrimaryCyan,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = aiMetrics.rationale,
                            color = MaterialTheme.colorScheme.onBackground,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 5. PIPELINE MODE SWITCHER: Live Real-Time Sensors vs Simulation Lab
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(4.dp)
        ) {
            Surface(
                color = if (!showSimLab) MaterialTheme.colorScheme.surface else Color.Transparent,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .weight(1f)
                    .clickable {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        showSimLab = false
                        onSetPipelineMode(PipelineMode.LIVE_SENSORS)
                    }
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 10.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(if (!showSimLab) SafeGreen else Color(0xFF9CA3AF))
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "LIVE SENSORS",
                        color = if (!showSimLab) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Surface(
                color = if (showSimLab) MaterialTheme.colorScheme.surface else Color.Transparent,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .weight(1f)
                    .clickable {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        showSimLab = true
                        onSetPipelineMode(PipelineMode.SIMULATION)
                    }
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 10.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Science,
                        contentDescription = "Simulation Lab",
                        tint = if (showSimLab) PrimaryCyan else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "SIMULATION LAB",
                        color = if (showSimLab) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // 6. SIMULATION LAB SCENARIO DECK (Smooth animated expand/collapse)
        AnimatedVisibility(
            visible = showSimLab,
            enter = fadeIn(tween(250)) + expandVertically(tween(250)),
            exit = fadeOut(tween(200)) + shrinkVertically(tween(200))
        ) {
            Column {
                Spacer(modifier = Modifier.height(12.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(20.dp),
                    border = BorderStroke(1.dp, PrimaryCyan.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "SIMULATE CRASH & HAZARD SCENARIOS",
                                color = PrimaryCyan,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "Tap to Inject",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 11.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        val scenarios = listOf(
                            Pair(SimulationScenario.CRASH_5G, DangerRed),
                            Pair(SimulationScenario.ROLLOVER_FALL, DangerRed),
                            Pair(SimulationScenario.HARSH_BRAKE, MonitoringYellow),
                            Pair(SimulationScenario.EXTREME_LEAN, MonitoringYellow),
                            Pair(SimulationScenario.SPEEDING, MonitoringYellow),
                            Pair(SimulationScenario.NORMAL_CRUISE, SafeGreen)
                        )

                        // 2x3 Grid of Interactive Simulation Chips
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            for (row in scenarios.chunked(2)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    for ((scenario, accentColor) in row) {
                                        Surface(
                                            color = MaterialTheme.colorScheme.surfaceVariant,
                                            shape = RoundedCornerShape(12.dp),
                                            border = BorderStroke(1.dp, accentColor.copy(alpha = 0.4f)),
                                            modifier = Modifier
                                                .weight(1f)
                                                .clickable {
                                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                    onSimulateScenario(scenario)
                                                }
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(10.dp),
                                                horizontalAlignment = Alignment.Start
                                            ) {
                                                Text(
                                                    text = scenario.iconDescription,
                                                    color = accentColor,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                                Spacer(modifier = Modifier.height(2.dp))
                                                Text(
                                                    text = scenario.displayName,
                                                    color = MaterialTheme.colorScheme.onBackground,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 7. DRIVER SAFETY SCORE & TRIP TELEMETRY
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "DRIVER SAFETY SCORE",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp
                        )
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(
                                text = "${animatedScore.toInt()}",
                                color = when {
                                    safetyScore >= 85 -> SafeGreen
                                    safetyScore >= 70 -> MonitoringYellow
                                    else -> DangerRed
                                },
                                fontSize = 34.sp,
                                fontWeight = FontWeight.Black
                            )
                            Text(
                                text = " / 100",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }
                    }

                    // Grade Badge
                    Surface(
                        color = when (driverGrade) {
                            "A+", "A" -> Color(0x2210B981)
                            "B" -> Color(0x22F59E0B)
                            else -> Color(0x22EF4444)
                        },
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(
                            1.dp,
                            when (driverGrade) {
                                "A+", "A" -> SafeGreen
                                "B" -> MonitoringYellow
                                else -> DangerRed
                            }
                        )
                    ) {
                        Text(
                            text = "GRADE $driverGrade",
                            color = when (driverGrade) {
                                "A+", "A" -> SafeGreen
                                "B" -> MonitoringYellow
                                else -> DangerRed
                            },
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
                }

                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.padding(vertical = 12.dp)
                )

                // Trip Distance & Duration
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Trip Distance", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        Text(
                            "${String.format("%.1f", tripDistanceKm)} km",
                            color = MaterialTheme.colorScheme.onBackground,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Column {
                        Text("Trip Duration", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        Text(
                            durationFormatted,
                            color = MaterialTheme.colorScheme.onBackground,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Column {
                        Text("Active Incidents", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        Text(
                            "${harshBrakesCount + sharpTurnsCount + crashesCount + fallsCount}",
                            color = if (harshBrakesCount + sharpTurnsCount + crashesCount + fallsCount > 0) MonitoringYellow else SafeGreen,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // 8. PRIMARY COCKPIT CONTROLS (Start / Stop Monitoring & SOS)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    if (isMonitoring) onStopMonitoring() else onStartMonitoring()
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isMonitoring) MaterialTheme.colorScheme.surfaceVariant else PrimaryCyan
                ),
                shape = RoundedCornerShape(16.dp),
                border = if (isMonitoring) BorderStroke(1.dp, MaterialTheme.colorScheme.outline) else null,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp)
            ) {
                Icon(
                    imageVector = if (isMonitoring) Icons.Default.Stop else Icons.Default.PlayArrow,
                    contentDescription = "Monitoring Toggle",
                    tint = if (isMonitoring) MaterialTheme.colorScheme.onBackground else Color.Black
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isMonitoring) "STOP RIDE" else "START RIDE",
                    color = if (isMonitoring) MaterialTheme.colorScheme.onBackground else Color.Black,
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp,
                    letterSpacing = 1.sp
                )
            }

            // Emergency SOS Button
            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onEmergencySos()
                },
                colors = ButtonDefaults.buttonColors(containerColor = DangerRed),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .weight(0.7f)
                    .height(56.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "Emergency SOS",
                    tint = Color.White
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "SOS",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp,
                    letterSpacing = 1.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun AiFeatureChip(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = RoundedCornerShape(10.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = label,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = value,
                color = MaterialTheme.colorScheme.onBackground,
                fontSize = 13.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
        }
    }
}
