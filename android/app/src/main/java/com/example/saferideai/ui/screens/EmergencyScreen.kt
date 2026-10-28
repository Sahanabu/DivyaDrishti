package com.example.saferideai.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.automirrored.filled.PhoneCallback
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saferideai.data.local.EmergencyContactEntity
import com.example.saferideai.ui.theme.DangerRed
import kotlinx.coroutines.delay

@Composable
fun EmergencyScreen(
    hazardRationale: String = "High-G collision impact detected",
    primaryPhone: String = "+91 8904791552",
    primaryName: String = "Emergency Family Contact",
    allContacts: List<EmergencyContactEntity> = emptyList(),
    countdownDuration: Int = 10,
    onCancel: () -> Unit,
    onCallNow: () -> Unit,
    onWhatsAppSos: () -> Unit,
    onLocateHospital: () -> Unit,
    onSosDispatched: () -> Unit
) {
    var countdown by remember { mutableIntStateOf(countdownDuration) }
    var isDispatched by remember { mutableStateOf(false) }

    // Pulse animation
    val infiniteTransition = rememberInfiniteTransition()
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        )
    )

    LaunchedEffect(countdown) {
        if (countdown > 0 && !isDispatched) {
            delay(1000)
            countdown -= 1
        } else if (countdown == 0 && !isDispatched) {
            isDispatched = true
            onSosDispatched()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DangerRed)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Spacer(modifier = Modifier.height(16.dp))
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "Crash Detected",
                    tint = Color.White,
                    modifier = Modifier.size(72.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "CRASH DETECTED",
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = hazardRationale,
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
            }

            // Central Countdown Clock
            Box(
                modifier = Modifier
                    .size(190.dp)
                    .scale(if (!isDispatched) scale else 1f)
                    .clip(CircleShape)
                    .background(Color.White),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    if (!isDispatched) {
                        Text(
                            text = "$countdown",
                            color = DangerRed,
                            fontSize = 68.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            text = "SECONDS TO SOS",
                            color = DangerRed,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Sent",
                            tint = Color(0xFF1B5E20),
                            modifier = Modifier.size(56.dp)
                        )
                        Text(
                            text = "SOS SENT",
                            color = Color(0xFF1B5E20),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Real-Time Lifeline Contact Verification Card
            Surface(
                color = Color(0x33000000),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Color(0x66FFFFFF)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.PhoneCallback,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "PRIMARY LIFELINE RECIPIENT",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "$primaryName ($primaryPhone)",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black
                    )
                    if (allContacts.size > 1) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "+ ${allContacts.size - 1} other saved contacts will receive automated SMS",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 11.sp
                        )
                    }
                }
            }

            // Action Buttons
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Primary Cancel Button
                Button(
                    onClick = onCancel,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Cancel", tint = DangerRed)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "I AM OK - CANCEL SOS",
                        color = DangerRed,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // If not yet dispatched, allow manual immediate dispatch
                if (!isDispatched) {
                    OutlinedButton(
                        onClick = {
                            isDispatched = true
                            onSosDispatched()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("DISPATCH SOS NOW (NO DELAY)", fontWeight = FontWeight.Bold)
                    }
                }

                // 1-Click WhatsApp Lifeline
                Button(
                    onClick = onWhatsAppSos,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.AutoMirrored.Filled.Message, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("1-Click WhatsApp Lifeline", color = Color.White, fontWeight = FontWeight.Bold)
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Nearest Hospital Locator
                    Button(
                        onClick = onLocateHospital,
                        modifier = Modifier
                            .weight(1f)
                            .height(46.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1976D2)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.LocalHospital, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Nearest Hospital", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }

                    // Direct Call Primary Contact
                    Button(
                        onClick = onCallNow,
                        modifier = Modifier
                            .weight(1f)
                            .height(46.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333333)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Call, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Call Help", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
