package com.example.saferideai.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saferideai.data.local.AlertEntity
import com.example.saferideai.data.local.TripEntity
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    alerts: List<AlertEntity> = emptyList(),
    trips: List<TripEntity> = emptyList(),
    onDeleteAlert: (Int) -> Unit = {},
    onClearAllAlerts: () -> Unit = {},
    onBack: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showClearConfirmDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Safety & Ride History", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (selectedTab == 0 && alerts.isNotEmpty()) {
                        IconButton(onClick = { showClearConfirmDialog = true }) {
                            Icon(Icons.Default.DeleteSweep, contentDescription = "Clear Alerts", tint = MaterialTheme.colorScheme.error)
                        }
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
        ) {
            // Tab Selector
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = MaterialTheme.colorScheme.primary
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Safety Alerts (${alerts.size})", fontWeight = FontWeight.SemiBold)
                        }
                    }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.TwoWheeler, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Trip Logs (${trips.size})", fontWeight = FontWeight.SemiBold)
                        }
                    }
                )
            }

            // Tab Content
            if (selectedTab == 0) {
                if (alerts.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF10B981),
                                modifier = Modifier.size(64.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Zero Incidents Logged",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "All sensor telemetry and riding dynamics are within safe bounds. Real-world crash, fall, and SOS alerts will appear here.",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(alerts, key = { it.id }) { alert ->
                            AlertHistoryCard(
                                alert = alert,
                                onDelete = { onDeleteAlert(alert.id) },
                                onOpenMap = {
                                    if (alert.lat != 0.0 && alert.lng != 0.0) {
                                        val uri = Uri.parse("geo:${alert.lat},${alert.lng}?q=${alert.lat},${alert.lng}(Incident Location)")
                                        val mapIntent = Intent(Intent.ACTION_VIEW, uri)
                                        try {
                                            context.startActivity(mapIntent)
                                        } catch (e: Exception) {}
                                    }
                                }
                            )
                        }
                    }
                }
            } else {
                if (trips.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.Route,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(64.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "No Trip Sessions Yet",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Press 'START RIDE' in the Cockpit to engage autonomous AI telemetry monitoring and track your rides.",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(trips, key = { it.id }) { trip ->
                            TripHistoryCard(trip = trip)
                        }
                    }
                }
            }
        }
    }

    if (showClearConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showClearConfirmDialog = false },
            title = { Text("Clear All Alert Logs?") },
            text = { Text("This will permanently remove all safety incident and SOS alert history from device storage.") },
            confirmButton = {
                Button(
                    onClick = {
                        onClearAllAlerts()
                        showClearConfirmDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Clear All")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showClearConfirmDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun AlertHistoryCard(
    alert: AlertEntity,
    onDelete: () -> Unit,
    onOpenMap: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("MMM dd, yyyy • hh:mm a", Locale.getDefault()) }
    val formattedTime = remember(alert.timestamp) { dateFormat.format(Date(alert.timestamp)) }

    val badgeColor = when {
        alert.isSevere -> Color(0xFFEF4444)
        alert.eventType.contains("BRAKE") -> Color(0xFFF59E0B)
        else -> Color(0xFF3B82F6)
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        border = BorderStroke(1.dp, badgeColor.copy(alpha = 0.4f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = badgeColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(6.dp),
                    border = BorderStroke(1.dp, badgeColor.copy(alpha = 0.6f))
                ) {
                    Text(
                        text = alert.eventType,
                        color = badgeColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = formattedTime,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Dismiss",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = alert.rationale,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Telemetry feature row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                TelemetryPill("G-Force", "${String.format("%.1f", alert.gForce)}G")
                TelemetryPill("Speed", "${alert.speedKmh.toInt()} km/h")
                if (alert.gyroDegS > 0) {
                    TelemetryPill("Gyro", "${alert.gyroDegS.toInt()}°/s")
                }
            }

            if (alert.primaryRecipient.isNotBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Notified: ${alert.primaryRecipient} (${alert.recipientsCount} contacts)",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                    if (alert.lat != 0.0 && alert.lng != 0.0) {
                        TextButton(
                            onClick = onOpenMap,
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                        ) {
                            Icon(Icons.Default.Place, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("View GPS", fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TelemetryPill(label: String, value: String) {
    Surface(
        color = MaterialTheme.colorScheme.background,
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "$label: ",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
    }
}

@Composable
fun TripHistoryCard(trip: TripEntity) {
    val dateFormat = remember { SimpleDateFormat("MMM dd, yyyy • hh:mm a", Locale.getDefault()) }
    val formattedStart = remember(trip.startTime) { dateFormat.format(Date(trip.startTime)) }

    val gradeColor = when (trip.grade) {
        "A+", "A" -> Color(0xFF10B981)
        "B" -> Color(0xFFF59E0B)
        else -> Color(0xFFEF4444)
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formattedStart,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Surface(
                    color = gradeColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, gradeColor)
                ) {
                    Text(
                        text = "Grade ${trip.grade} • Score ${trip.safetyScore}",
                        color = gradeColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Distance", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${String.format("%.2f", trip.distanceKm)} km", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
                Column {
                    Text("Max Speed", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${trip.maxSpeedKmh.toInt()} km/h", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
                Column {
                    Text("Avg Speed", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${trip.avgSpeedKmh.toInt()} km/h", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
                Column {
                    Text("Incidents", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${trip.incidentsCount}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = if (trip.incidentsCount > 0) Color(0xFFEF4444) else Color(0xFF10B981))
                }
            }
        }
    }
}
