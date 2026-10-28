package com.example.saferideai.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saferideai.data.local.EmergencyContactEntity
import com.example.saferideai.data.local.UserEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    rider: UserEntity?,
    contacts: List<EmergencyContactEntity>,
    isVoiceMuted: Boolean,
    isDarkTheme: Boolean = true,
    phonePlacementMode: String = "AUTO",
    sosCountdownSeconds: Int = 10,
    gyroSensitivity: String = "BALANCED",
    autoSmsEnabled: Boolean = true,
    onToggleTheme: () -> Unit = {},
    onToggleVoiceMute: () -> Unit,
    onSetPhonePlacementMode: (String) -> Unit = {},
    onSetSosCountdownSeconds: (Int) -> Unit = {},
    onSetGyroSensitivity: (String) -> Unit = {},
    onSetAutoSmsEnabled: (Boolean) -> Unit = {},
    onAddContact: (String, String, String, Boolean) -> Unit,
    onUpdateContact: (Int, String, String, String, Boolean) -> Unit = { _, _, _, _, _ -> },
    onSetPrimaryContact: (Int) -> Unit = {},
    onDeleteContact: (Int) -> Unit,
    onUpdateProfile: (String, String, String, String, String) -> Unit = { _, _, _, _, _ -> },
    onLogout: () -> Unit,
    onBack: () -> Unit
) {
    // Add Contact Dialog State
    var showAddDialog by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }
    var newPhone by remember { mutableStateOf("") }
    var newRelation by remember { mutableStateOf("Family") }
    var newIsPrimary by remember { mutableStateOf(contacts.isEmpty()) }

    // Edit Contact Dialog State
    var showEditDialog by remember { mutableStateOf(false) }
    var editingContactId by remember { mutableIntStateOf(0) }
    var editName by remember { mutableStateOf("") }
    var editPhone by remember { mutableStateOf("") }
    var editRelation by remember { mutableStateOf("Family") }
    var editIsPrimary by remember { mutableStateOf(false) }

    // Edit Rider Profile Dialog State
    var showProfileDialog by remember { mutableStateOf(false) }
    var profileName by remember { mutableStateOf("") }
    var profilePhone by remember { mutableStateOf("") }
    var profileVehicle by remember { mutableStateOf("") }
    var profileBlood by remember { mutableStateOf("O+") }
    var profileNotes by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile & Settings", fontWeight = FontWeight.Bold) },
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. RIDER PROFILE CARD
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Rider Profile Information",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = {
                        profileName = rider?.name ?: "Guest Rider"
                        profilePhone = rider?.phoneNumber ?: ""
                        profileVehicle = rider?.vehicleNumber ?: ""
                        profileBlood = rider?.bloodGroup ?: "O+"
                        profileNotes = rider?.medicalNotes ?: "None"
                        showProfileDialog = true
                    }) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit Profile", tint = MaterialTheme.colorScheme.primary)
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Image(
                                painter = painterResource(id = com.example.saferideai.R.drawable.app_logo),
                                contentDescription = "DivyaDrishti App Logo",
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(RoundedCornerShape(12.dp))
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(rider?.name ?: "Guest Rider", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                                val userMeta = if (rider != null) "@${rider.username} • ${rider.phoneNumber.ifEmpty { "No phone" }}" else "Unauthenticated session"
                                Text(userMeta, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.2f))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("Vehicle Registration", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(rider?.vehicleNumber?.ifEmpty { "Not Registered" } ?: "Not Registered", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                            Column {
                                Text("Blood Group", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(rider?.bloodGroup ?: "O+", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Medical Notes: ${rider?.medicalNotes ?: "None"}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f))
                    }
                }
            }

            // 2. REAL-WORLD PHONE PLACEMENT & GYROSCOPE TUNING
            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Phone Placement & Gyroscope Safety",
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Calibrates biomechanical gyroscope thresholds based on how you carry your phone",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Current Placement Mode:", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)

                        // 4 Interactive Placement Options
                        val placementModes = listOf(
                            Triple("AUTO", "⚡ Auto-Adaptive", "Dynamic multi-sensor invariant protection"),
                            Triple("UPPER_POCKET", "👕 Upper Pocket", "Tuned for chest/jacket torso tumble & ejection"),
                            Triple("PANT_POCKET", "👖 Pant Pocket", "Tuned for seated hip angle & leg gyroscopic spin"),
                            Triple("HANDLEBAR_MOUNT", "🏍️ Handlebar Mount", "Direct motorcycle frame lean & vibration damping")
                        )

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            placementModes.forEach { (modeKey, title, desc) ->
                                val isSelected = phonePlacementMode == modeKey
                                Surface(
                                    onClick = { onSetPhonePlacementMode(modeKey) },
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.background,
                                    border = BorderStroke(
                                        if (isSelected) 1.5.dp else 1.dp,
                                        if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        RadioButton(
                                            selected = isSelected,
                                            onClick = { onSetPhonePlacementMode(modeKey) }
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                            Text(desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }
                            }
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.2f))

                        // Gyroscope Sensitivity
                        Text("Gyroscope Fall Sensitivity:", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("BALANCED" to "Balanced", "HIGH_SENSITIVITY" to "High", "AGGRESSIVE" to "Extra Safe").forEach { (key, label) ->
                                val isSel = gyroSensitivity == key
                                FilterChip(
                                    selected = isSel,
                                    onClick = { onSetGyroSensitivity(key) },
                                    label = { Text(label, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.2f))

                        // SOS Countdown Duration
                        Text("Emergency Cancel Countdown Window:", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(5 to "5 Sec (Fast)", 10 to "10 Sec (Std)", 15 to "15 Sec (Safe)").forEach { (seconds, label) ->
                                val isSel = sosCountdownSeconds == seconds
                                FilterChip(
                                    selected = isSel,
                                    onClick = { onSetSosCountdownSeconds(seconds) },
                                    label = { Text(label, fontSize = 12.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }

            // 3. EMERGENCY CONTACTS (LIFELINE)
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Emergency Family Contacts (${contacts.size})",
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Primary contact receives instant WhatsApp & direct calls",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp
                        )
                    }
                    IconButton(onClick = {
                        newName = ""
                        newPhone = ""
                        newRelation = "Family"
                        newIsPrimary = contacts.isEmpty()
                        showAddDialog = true
                    }) {
                        Icon(Icons.Default.AddCircle, contentDescription = "Add Contact", tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            items(contacts) { contact ->
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    border = if (contact.isPrimary) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(contact.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                if (contact.isPrimary) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(6.dp),
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary)
                                    ) {
                                        Text(
                                            text = "★ PRIMARY LIFELINE",
                                            color = MaterialTheme.colorScheme.primary,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Black,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "${contact.phoneNumber} (${contact.relationship})",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = { onSetPrimaryContact(contact.id) }) {
                                Icon(
                                    imageVector = if (contact.isPrimary) Icons.Default.Star else Icons.Default.StarBorder,
                                    contentDescription = "Set Primary",
                                    tint = if (contact.isPrimary) Color(0xFFFBBF24) else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            IconButton(onClick = {
                                editingContactId = contact.id
                                editName = contact.name
                                editPhone = contact.phoneNumber
                                editRelation = contact.relationship
                                editIsPrimary = contact.isPrimary
                                showEditDialog = true
                            }) {
                                Icon(Icons.Default.Edit, contentDescription = "Edit Contact", tint = MaterialTheme.colorScheme.primary)
                            }
                            IconButton(onClick = { onDeleteContact(contact.id) }) {
                                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }
            }

            // 4. SYSTEM & HARDWARE PREFERENCES
            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "System & Hardware Optimizations",
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        // Theme Toggle Switch
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("App Theme", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                Text(if (isDarkTheme) "Cyber Obsidian Dark Mode" else "Clean High-Contrast Light Mode", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(
                                checked = isDarkTheme,
                                onCheckedChange = { onToggleTheme() }
                            )
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.2f))

                        // Voice ADAS Switch
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Voice ADAS Spoken Alerts", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                Text("Audible warnings for hard braking & collision", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(
                                checked = !isVoiceMuted,
                                onCheckedChange = { onToggleVoiceMute() }
                            )
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.2f))

                        // Auto-SMS Dispatch Switch
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Direct Cellular SMS Dispatch", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                Text("Send cellular SMS automatically via phone SIM upon accident", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(
                                checked = autoSmsEnabled,
                                onCheckedChange = { onSetAutoSmsEnabled(it) }
                            )
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.2f))

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Memory, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text("Adaptive Sensor Power Mode (Active)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                Text("Optimized for 4GB RAM & medium SoC (100% Free Forever)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }

            // 5. LOGOUT BUTTON
            item {
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onLogout,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Logout")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("LOG OUT OF RIDER PROFILE", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            }
        }
    }

    // Dialog 1: Add New Emergency Contact
    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Add Emergency Contact", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = newName,
                        onValueChange = { newName = it },
                        label = { Text("Contact Full Name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newPhone,
                        onValueChange = { newPhone = it },
                        label = { Text("Phone Number (with Country Code)") },
                        placeholder = { Text("+91 9876543210") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newRelation,
                        onValueChange = { newRelation = it },
                        label = { Text("Relationship (e.g. Family, Doctor)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = newIsPrimary,
                            onCheckedChange = { newIsPrimary = it }
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Set as Primary Emergency Contact", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newName.isNotBlank() && newPhone.isNotBlank()) {
                            onAddContact(newName, newPhone, newRelation, newIsPrimary)
                            showAddDialog = false
                        }
                    }
                ) {
                    Text("Save Contact")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showAddDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Dialog 2: Edit Emergency Contact
    if (showEditDialog) {
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            title = { Text("Edit Emergency Contact", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text("Contact Full Name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = editPhone,
                        onValueChange = { editPhone = it },
                        label = { Text("Phone Number") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = editRelation,
                        onValueChange = { editRelation = it },
                        label = { Text("Relationship") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = editIsPrimary,
                            onCheckedChange = { editIsPrimary = it }
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Set as Primary Emergency Contact", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (editName.isNotBlank() && editPhone.isNotBlank()) {
                            onUpdateContact(editingContactId, editName, editPhone, editRelation, editIsPrimary)
                            showEditDialog = false
                        }
                    }
                ) {
                    Text("Update Contact")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showEditDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Dialog 3: Edit Rider Profile
    if (showProfileDialog) {
        AlertDialog(
            onDismissRequest = { showProfileDialog = false },
            title = { Text("Edit Rider Profile", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = profileName,
                        onValueChange = { profileName = it },
                        label = { Text("Full Name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = profilePhone,
                        onValueChange = { profilePhone = it },
                        label = { Text("Phone Number") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = profileVehicle,
                        onValueChange = { profileVehicle = it },
                        label = { Text("Vehicle Registration #") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = profileBlood,
                        onValueChange = { profileBlood = it },
                        label = { Text("Blood Group (e.g. O+, A-)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = profileNotes,
                        onValueChange = { profileNotes = it },
                        label = { Text("Medical Notes / Allergies") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (profileName.isNotBlank()) {
                            onUpdateProfile(profileName, profilePhone, profileVehicle, profileBlood, profileNotes)
                            showProfileDialog = false
                        }
                    }
                ) {
                    Text("Save Changes")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showProfileDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
