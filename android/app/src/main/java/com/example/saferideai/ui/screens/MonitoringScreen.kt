package com.example.saferideai.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saferideai.ml.AppState
import com.example.saferideai.sensors.SensorData
import com.example.saferideai.ui.theme.*
import kotlin.math.abs

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MonitoringScreen(
    sensorData: SensorData,
    speedKmh: Float = 0.0f,
    maxSpeedKmh: Float = 0.0f,
    appState: AppState,
    onBack: () -> Unit
) {
    val animatedSpeed by animateFloatAsState(targetValue = speedKmh, animationSpec = tween(150))
    val animatedLean by animateFloatAsState(targetValue = sensorData.leanAngle, animationSpec = tween(80))

    val speedColor = when {
        speedKmh > 75f -> DangerRed
        speedKmh > 50f -> MonitoringYellow
        else -> SafeGreen
    }

    val gForceColor = when {
        sensorData.gForce >= 4.5f -> DangerRed
        sensorData.gForce >= 2.0f -> MonitoringYellow
        else -> SafeGreen
    }

    val gyroColor = when {
        sensorData.gyroDegMagnitude >= 280f -> DangerRed
        sensorData.gyroDegMagnitude >= 120f -> MonitoringYellow
        else -> MaterialTheme.colorScheme.primary
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sensor Telemetry & Instruments", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. DIGITAL SPEEDOMETER INSTRUMENT CARD
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Speed, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Mobile Speedometer", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        Badge(containerColor = speedColor) {
                            Text(
                                text = if (speedKmh > 75f) "OVERSPEED" else if (speedKmh > 10f) "CRUISING" else "IDLE",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Speed Dial Value
                    Text(
                        text = "${animatedSpeed.toInt()}",
                        fontSize = 58.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = speedColor
                    )
                    Text("KILOMETERS PER HOUR (KM/H)", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(modifier = Modifier.height(12.dp))

                    // Speed Metrics Row
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.background.copy(alpha = 0.5f))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Peak Speed", fontSize = 10.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
                            Text("${maxSpeedKmh.toInt()} km/h", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Inertial Est.", fontSize = 10.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
                            Text("${sensorData.inertialSpeedEstimateKmh.toInt()} km/h", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("GPS Fused", fontSize = 10.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
                            Text("Active", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SafeGreen)
                        }
                    }
                }
            }

            // 2. 3D GYROSCOPE & MOTORCYCLE LEAN ANGLE INSTRUMENT CARD
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Explore, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Gyroscope 3D Dynamics", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        Text(
                            text = if (sensorData.isGyroAvailable) "ONLINE" else "UNAVAILABLE",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (sensorData.isGyroAvailable) SafeGreen else DangerRed
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Motorcycle Lean Angle Meter
                    val leanText = when {
                        animatedLean < -3f -> "LEFT LEAN: ${abs(animatedLean).toInt()}°"
                        animatedLean > 3f -> "RIGHT LEAN: ${animatedLean.toInt()}°"
                        else -> "UPRIGHT (LEVEL)"
                    }

                    Text(
                        text = leanText,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (abs(animatedLean) > 45f) DangerRed else MaterialTheme.colorScheme.primary
                    )
                    Text("Motorcycle Bank & Lean Angle", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(modifier = Modifier.height(12.dp))

                    // Visual Lean Angle Indicator Bar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(16.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.background.copy(alpha = 0.5f))
                    ) {
                        // Center reference marker
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .width(2.dp)
                                .align(Alignment.Center)
                                .background(Color.White)
                        )
                        // Dynamic Lean Indicator Pill
                        val normalizedOffset = (animatedLean / 70f).coerceIn(-1f, 1f)
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .width(18.dp)
                                .align(BiasAlignment(normalizedOffset, 0f))
                                .clip(CircleShape)
                                .background(if (abs(animatedLean) > 45f) DangerRed else MaterialTheme.colorScheme.primary)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Gyroscope 3-Axis Angular Velocities in Deg/Sec
                    Text("Angular Rotational Velocities (°/s)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        SensorMetricCol("Roll (X)", "${sensorData.gyroDegX.toInt()}°/s", "Banking Rate")
                        SensorMetricCol("Pitch (Y)", "${sensorData.gyroDegY.toInt()}°/s", "Dive / Squat")
                        SensorMetricCol("Yaw (Z)", "${sensorData.gyroDegZ.toInt()}°/s", "Cornering")
                        SensorMetricCol("Total", "${sensorData.gyroDegMagnitude.toInt()}°/s", "Spin Shock")
                    }
                }
            }

            // 3. ACCELEROMETER & G-FORCE CARD
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Sensors, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Accelerometer & G-Force", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        Text("1G = 9.8 m/s²", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "${String.format("%.2f", sensorData.gForce)} G",
                        fontSize = 38.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = gForceColor
                    )
                    Text("Total Linear Acceleration: ${String.format("%.1f", sensorData.accelerationMagnitude)} m/s²", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        SensorMetricCol("Lateral (X)", "${String.format("%.1f", sensorData.accelX)}", "m/s²")
                        SensorMetricCol("Longit. (Y)", "${String.format("%.1f", sensorData.accelY)}", "m/s² (Brake/Acc)")
                        SensorMetricCol("Vertical (Z)", "${String.format("%.1f", sensorData.accelZ)}", "m/s²")
                        SensorMetricCol("Pitch Tilt", "${sensorData.pitch.toInt()}°", "Grade")
                    }
                }
            }

            // 4. EDGE SENSOR FUSION STATUS
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Sensor Fusion State", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("Accelerometer + Gyroscope + GPS Fused (Low Power)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Badge(containerColor = if (appState == AppState.MONITORING) SafeGreen else MaterialTheme.colorScheme.outline) {
                        Text(appState.name, color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun SensorMetricCol(title: String, value: String, unit: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        Text(unit, fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f), textAlign = TextAlign.Center)
    }
}
