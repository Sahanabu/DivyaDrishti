package com.example.saferideai.ui.screens

import android.net.Uri
import android.widget.VideoView
import androidx.compose.animation.*
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.saferideai.R
import kotlinx.coroutines.delay

private data class RoadScenario(
    val id: String,
    val title: String,
    val environment: String,
    val roadCondition: String,
    val speedKmh: String,
    val leanAngle: String,
    val hazardType: String,
    val defenseShield: String,
    val accentColor: Color,
    val iconVector: ImageVector
)

private val roadScenarios = listOf(
    RoadScenario(
        id = "HIGHWAY",
        title = "HIGHWAY HIGH-SPEED CRUISE",
        environment = "Multi-Lane Express Highway • 80 km/h Corridor",
        roadCondition = "Dry Asphalt • Optimal Traction",
        speedKmh = "82 KM/H",
        leanAngle = "4° UPRIGHT",
        hazardType = "High-G Vehicle Collision Impact",
        defenseShield = "Kinetic Collision Model (Peak G & Jerk Filter)",
        accentColor = Color(0xFF06B6D4), // Electric Cyan
        iconVector = Icons.Default.Speed
    ),
    RoadScenario(
        id = "MONSOON",
        title = "MONSOON WET ASPHALT CORNERING",
        environment = "Rain-Slicked Tarmac • Blind Hairpin Bend",
        roadCondition = "Wet Surface • Low Traction (μ = 0.55)",
        speedKmh = "38 KM/H",
        leanAngle = "42° DEEP LEAN",
        hazardType = "Lateral Slip / Lowside Bike Rollover (>60° Tilt)",
        defenseShield = "6-DOF IMU Dynamic Gyroscope Lean Tracker",
        accentColor = Color(0xFFF59E0B), // Amber Warning
        iconVector = Icons.Default.Thunderstorm
    ),
    RoadScenario(
        id = "CITY",
        title = "DENSE URBAN TRAFFIC CUT-IN",
        environment = "Stop-and-Go Congestion • Unsignaled Cut-In",
        roadCondition = "Urban Pavement • Pedestrian Crossings",
        speedKmh = "45 → 0 KM/H",
        leanAngle = "0° LEVEL",
        hazardType = "Emergency Harsh Braking (-5.4 m/s² Decel)",
        defenseShield = "Deceleration Jerk Model (dG/dt) & ADAS Audio Alert",
        accentColor = Color(0xFF10B981), // Emerald Safe Filter
        iconVector = Icons.Default.Traffic
    ),
    RoadScenario(
        id = "NIGHT",
        title = "UNLIT NIGHT HIGHWAY & ISOLATION",
        environment = "Zero Ambient Streetlights • Remote Bypass",
        roadCondition = "Unlit Highway • Potential Pothole Drops",
        speedKmh = "65 KM/H",
        leanAngle = "2° STEADY",
        hazardType = "Rider Down / Unresponsive Emergency",
        defenseShield = "Autonomous 10s Countdown + Satellite SOS Dispatch",
        accentColor = Color(0xFFEF4444), // Crimson Emergency Red
        iconVector = Icons.Default.Shield
    )
)

@Composable
fun SplashScreen(onNavigateNext: () -> Unit) {
    val context = LocalContext.current
    var hasNavigated by remember { mutableStateOf(false) }
    var bootPhaseText by remember { mutableStateOf("CALIBRATING 6-AXIS IMU SENSORS...") }
    var bootProgress by remember { mutableFloatStateOf(0.15f) }
    var activeScenarioIndex by remember { mutableIntStateOf(0) }

    val animatedBootProgress by animateFloatAsState(
        targetValue = bootProgress,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "bootProgress"
    )

    fun proceedOnce() {
        if (!hasNavigated) {
            hasNavigated = true
            onNavigateNext()
        }
    }

    // Dynamic boot status sequence calibrating across real road scenarios
    LaunchedEffect(Unit) {
        // Scenario 1: Highway Cruise (Speedometer & Collision Radar)
        activeScenarioIndex = 0
        bootPhaseText = "SCENARIO 1/4: HIGHWAY COLLISION RADAR (82 KM/H)..."
        bootProgress = 0.25f
        delay(1100)

        // Scenario 2: Monsoon Wet Road Cornering (Gyroscope Lean & Fall Gate)
        activeScenarioIndex = 1
        bootPhaseText = "SCENARIO 2/4: MONSOON WET ASPHALT LEAN DEFENSE (42°)..."
        bootProgress = 0.50f
        delay(1100)

        // Scenario 3: Urban Congestion (Harsh Braking Jerk Filter)
        activeScenarioIndex = 2
        bootPhaseText = "SCENARIO 3/4: URBAN CUT-IN HARSH BRAKE BUFFER (-5.4 M/S²)..."
        bootProgress = 0.75f
        delay(1100)

        // Scenario 4: Night Remote Highway (Emergency Lifeline & SOS)
        activeScenarioIndex = 3
        bootPhaseText = "SCENARIO 4/4: UNLIT ROAD AUTONOMOUS SOS LIFELINE..."
        bootProgress = 0.95f
        delay(1100)

        bootPhaseText = "SYSTEM ONLINE • ALL ROAD SCENARIOS PROTECTED"
        bootProgress = 1.0f
        delay(600)
        proceedOnce()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF030712)) // Obsidian deep dark background
    ) {
        // 1. Photorealistic Real-Road Poster Image
        Image(
            painter = painterResource(id = R.drawable.helmet_splash_poster),
            contentDescription = "DivyaDrishti Smart Helmet Real Road Scene",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        // 2. Hardware-Accelerated Ambient Video View Layer (Looping behind HUD)
        AndroidView(
            factory = { ctx ->
                VideoView(ctx).apply {
                    try {
                        val videoUri = Uri.parse("android.resource://${ctx.packageName}/${R.raw.helmet_splash_video}")
                        setVideoURI(videoUri)
                        setOnPreparedListener { mp ->
                            mp.isLooping = true
                            mp.setVolume(0f, 0f)
                            start()
                        }
                        setOnErrorListener { _, _, _ ->
                            true
                        }
                    } catch (e: Exception) {
                        // Poster remains active
                    }
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // 3. Top and Bottom Sci-Fi Vignette Gradient
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xEE030712),
                            Color(0x33030712),
                            Color(0x55030712),
                            Color(0xF2030712)
                        )
                    )
                )
        )

        // 4. Header Bar: System Brand & Skip Pill
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Futuristic App Brand Badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color(0x77111827))
                    .border(1.dp, Color(0xFF06B6D4).copy(alpha = 0.5f), RoundedCornerShape(20.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF10B981))
                )
                Text(
                    text = "DIVYADRISHTI AI",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )
            }

            // Quick Skip Button
            Surface(
                color = Color(0x771F2937),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, Color(0x669CA3AF)),
                modifier = Modifier.clickable { proceedOnce() }
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "SKIP",
                        color = Color(0xFFE5E7EB),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = "Skip",
                        tint = Color(0xFFE5E7EB),
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }

        // 5. Center HUD: Real Road Scenarios Live Threat Calibration Deck
        val activeScenario = roadScenarios[activeScenarioIndex]
        AnimatedContent(
            targetState = activeScenario,
            transitionSpec = {
                (fadeIn(tween(350)) + slideInVertically(tween(350)) { it / 3 })
                    .togetherWith(fadeOut(tween(250)) + slideOutVertically(tween(250)) { -it / 3 })
            },
            label = "scenarioDeck",
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 20.dp)
        ) { scenario ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xDD0B1120)),
                shape = RoundedCornerShape(22.dp),
                border = BorderStroke(1.5.dp, scenario.accentColor.copy(alpha = 0.8f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.Start
                ) {
                    // Scenario Pill & Real Road Badge
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = scenario.accentColor.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, scenario.accentColor.copy(alpha = 0.4f))
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(
                                    imageVector = scenario.iconVector,
                                    contentDescription = null,
                                    tint = scenario.accentColor,
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "ROAD SCENARIO 0${activeScenarioIndex + 1}/04",
                                    color = scenario.accentColor,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                )
                            }
                        }

                        Surface(
                            color = Color(0x3310B981),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "CALIBRATED",
                                color = Color(0xFF10B981),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Scenario Title & Environment
                    Text(
                        text = scenario.title,
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = scenario.environment,
                        color = Color(0xFF9CA3AF),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Dual Simulated Sensor Telemetry Readouts (Speed & Lean/Tilt)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(
                            color = Color(0x66111827),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, Color(0x33374151)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(
                                    text = "ROAD SPEED",
                                    color = Color(0xFF9CA3AF),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = scenario.speedKmh,
                                    color = Color.White,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }

                        Surface(
                            color = Color(0x66111827),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, Color(0x33374151)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(
                                    text = "LEAN / ORIENTATION",
                                    color = Color(0xFF9CA3AF),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = scenario.leanAngle,
                                    color = scenario.accentColor,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Road Condition & Sensor Shield Info
                    Surface(
                        color = Color(0x55030712),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(scenario.accentColor)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = scenario.roadCondition,
                                    color = Color(0xFFE5E7EB),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "AI Shield: ${scenario.defenseShield}",
                                color = Color(0xFF9CA3AF),
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // 4-Segment Scenario Dot Progression Bar
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        for (i in 0 until 4) {
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(3.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(
                                        if (i == activeScenarioIndex) scenario.accentColor
                                        else if (i < activeScenarioIndex) Color(0xFF10B981)
                                        else Color(0x44374151)
                                    )
                            )
                        }
                    }
                }
            }
        }

        // 6. Bottom HUD Diagnostics & Status Bar
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "DIVYADRISHTI",
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 4.sp
            )

            Text(
                text = "SMART HELMET & REAL-WORLD TELEMETRY",
                color = Color(0xFF06B6D4), // Electric Cyan
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Linear Cyber Progress Track
            LinearProgressIndicator(
                progress = { animatedBootProgress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp)),
                color = Color(0xFF06B6D4),
                trackColor = Color(0x33374151)
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Diagnostic Telemetry Text
            Text(
                text = bootPhaseText,
                color = Color(0xFF9CA3AF),
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium,
                letterSpacing = 0.8.sp,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}
