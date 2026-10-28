package com.example.saferideai.ui.screens

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.location.Location
import android.net.Uri
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.saferideai.ui.theme.SurfaceDark
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MapScreen(
    location: Location?,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val lat = location?.latitude ?: 12.971598
    val lng = location?.longitude ?: 77.594562
    val accuracy = location?.accuracy ?: 0f
    val speedKmh = ((location?.speed ?: 0f) * 3.6f).toInt()
    val altitude = location?.altitude ?: 0.0

    // Construct 100% Free-Tier OpenStreetMap HTML using Leaflet (Created once with smooth JS position interpolation)
    val initialLat = remember { lat }
    val initialLng = remember { lng }

    val osmHtml = remember {
        """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body { margin: 0; padding: 0; background: #0b0f19; font-family: sans-serif; overflow: hidden; }
                #map { width: 100vw; height: 100vh; background: #0b0f19; }
                .leaflet-tile { filter: brightness(0.75) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }
                .pulse-marker {
                    width: 18px;
                    height: 18px;
                    background: #06b6d4;
                    border: 3px solid #ffffff;
                    border-radius: 50%;
                    box-shadow: 0 0 12px #06b6d4;
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 14px rgba(6, 182, 212, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([$initialLat, $initialLng], 16);
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(map);

                var customIcon = L.divIcon({
                    className: 'pulse-marker',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });

                var marker = L.marker([$initialLat, $initialLng], { icon: customIcon }).addTo(map);
                var circle = L.circle([$initialLat, $initialLng], {
                    color: '#06b6d4',
                    fillColor: '#06b6d4',
                    fillOpacity: 0.15,
                    radius: Math.max(15, ${accuracy.toInt()})
                }).addTo(map);

                window.updateRiderPosition = function(newLat, newLng, newAcc) {
                    var newPos = [newLat, newLng];
                    marker.setLatLng(newPos);
                    circle.setLatLng(newPos);
                    circle.setRadius(Math.max(15, newAcc));
                    map.panTo(newPos, { animate: true, duration: 0.8 });
                };
            </script>
        </body>
        </html>
        """.trimIndent()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Live Telemetry Map", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text(
                            "100% Free Tier • OpenStreetMap",
                            fontSize = 11.sp,
                            color = Color(0xFF10B981),
                            fontWeight = FontWeight.Medium
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
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
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Free Tier OpenStreetMap Live Viewport
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .border(1.dp, Color(0xFF1F2937), RoundedCornerShape(20.dp))
                    .background(Color(0xFF030712))
            ) {
                AndroidView(
                    factory = { ctx ->
                        WebView(ctx).apply {
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            settings.cacheMode = WebSettings.LOAD_DEFAULT
                            webViewClient = WebViewClient()
                            loadDataWithBaseURL("https://openstreetmap.org", osmHtml, "text/html", "UTF-8", null)
                        }
                    },
                    update = { webView ->
                        // Smoothly glide position with zero document reloading
                        webView.evaluateJavascript("if (window.updateRiderPosition) { window.updateRiderPosition($lat, $lng, ${accuracy.toInt()}); }", null)
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Free Tier Tag Badge overlay on map
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(12.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xCC111827))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF10B981))
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "ZERO API KEY • FREE",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Detailed GPS Telemetry Information Card
            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "GPS COORDINATES",
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.GpsFixed,
                                contentDescription = "Fixed",
                                tint = Color(0xFF10B981),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "±${accuracy.toInt()}m Accuracy",
                                color = Color(0xFF10B981),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Lat: ${String.format(Locale.US, "%.6f", lat)}\nLng: ${String.format(Locale.US, "%.6f", lng)}",
                        color = MaterialTheme.colorScheme.onBackground,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        lineHeight = 24.sp
                    )

                    Divider(
                        color = Color(0x22FFFFFF),
                        modifier = Modifier.padding(vertical = 12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Current Speed", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                            Text("$speedKmh km/h", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                        Column {
                            Text("Altitude", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                            Text("${altitude.toInt()} m", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                        Column {
                            Text("Fix Provider", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                            Text("GNSS/Fused", color = Color(0xFF06B6D4), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Dual Action Buttons: Turn-by-Turn Navigation & Share Pin
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Free Turn-by-Turn in Installed Map App
                OutlinedButton(
                    onClick = {
                        val geoUri = Uri.parse("geo:$lat,$lng?q=$lat,$lng(Rider+Location)")
                        val mapIntent = Intent(Intent.ACTION_VIEW, geoUri).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        try {
                            context.startActivity(mapIntent)
                        } catch (e: Exception) {
                            // Fallback to web browser OSM
                            val webUri = Uri.parse("https://www.openstreetmap.org/?mlat=$lat&mlon=$lng#map=16/$lat/$lng")
                            context.startActivity(Intent(Intent.ACTION_VIEW, webUri))
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF06B6D4))
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = "Navigate", tint = Color(0xFF06B6D4))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("NAVIGATE", color = Color(0xFF06B6D4), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }

                // Share Location Intent (Zero SMS/API Costs)
                Button(
                    onClick = {
                        val latStr = String.format(Locale.US, "%.6f", lat)
                        val lngStr = String.format(Locale.US, "%.6f", lng)
                        val shareText = """
                            DivyaDrishti Live GPS Location:
                            Coordinates: $latStr, $lngStr
                            Speed: $speedKmh km/h
                            
                            OpenStreetMap: https://www.openstreetmap.org/?mlat=$latStr&mlon=$lngStr#map=16/$latStr/$lngStr
                            Google Maps: https://maps.google.com/?q=$latStr,$lngStr
                        """.trimIndent()

                        val sendIntent = Intent().apply {
                            action = Intent.ACTION_SEND
                            putExtra(Intent.EXTRA_TEXT, shareText)
                            type = "text/plain"
                        }
                        val shareIntent = Intent.createChooser(sendIntent, "Share Location via")
                        context.startActivity(shareIntent)
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Default.Share, contentDescription = "Share Location")
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("SHARE PIN", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}
