package com.example.saferideai.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saferideai.data.UserManager
import com.example.saferideai.data.local.AppDatabase
import com.example.saferideai.data.repository.AuthRepository
import kotlinx.coroutines.launch

@Composable
fun AuthScreen(
    onLoginSuccess: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val database = remember { AppDatabase.getDatabase(context) }
    val userManager = remember { UserManager(context) }
    val authRepo = remember { AuthRepository(database, userManager) }

    var selectedTab by remember { mutableStateOf(0) } // 0: Login, 1: Sign Up

    // Login fields
    var loginUsernameOrEmail by remember { mutableStateOf("") }
    var loginPassword by remember { mutableStateOf("") }
    var loginPasswordVisible by remember { mutableStateOf(false) }

    // Register fields
    var regName by remember { mutableStateOf("") }
    var regUsername by remember { mutableStateOf("") }
    var regEmail by remember { mutableStateOf("") }
    var regPassword by remember { mutableStateOf("") }
    var regConfirmPassword by remember { mutableStateOf("") }
    var regPhone by remember { mutableStateOf("+91 ") }
    var regBloodGroup by remember { mutableStateOf("O+") }
    var regVehicle by remember { mutableStateOf("") }
    var regPasswordVisible by remember { mutableStateOf(false) }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        authRepo.initDefaultDataIfEmpty()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            // App Brand Logo
            Image(
                painter = painterResource(id = com.example.saferideai.R.drawable.app_logo),
                contentDescription = "DivyaDrishti Logo",
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .border(1.5.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "DivyaDrishti",
                color = MaterialTheme.colorScheme.primary,
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold
            )
            Text(
                text = "AI Smart Rider Safety & Telemetry",
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Traditional Auth Mode Switcher
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = {
                        selectedTab = 0
                        errorMessage = null
                    },
                    text = { Text("Sign In", fontWeight = FontWeight.SemiBold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = {
                        selectedTab = 1
                        errorMessage = null
                    },
                    text = { Text("Sign Up", fontWeight = FontWeight.SemiBold) }
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            if (errorMessage != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = errorMessage ?: "",
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(12.dp),
                        fontSize = 14.sp
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            if (successMessage != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1B5E20)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = successMessage ?: "",
                        color = Color.White,
                        modifier = Modifier.padding(12.dp),
                        fontSize = 14.sp
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // ==================== TAB 0: SIGN IN ====================
            if (selectedTab == 0) {
                OutlinedTextField(
                    value = loginUsernameOrEmail,
                    onValueChange = { loginUsernameOrEmail = it },
                    label = { Text("Username or Email") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = loginPassword,
                    onValueChange = { loginPassword = it },
                    label = { Text("Password") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                    trailingIcon = {
                        IconButton(onClick = { loginPasswordVisible = !loginPasswordVisible }) {
                            Icon(
                                imageVector = if (loginPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = "Toggle password"
                            )
                        }
                    },
                    visualTransformation = if (loginPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        isLoading = true
                        errorMessage = null
                        scope.launch {
                            val res = authRepo.login(loginUsernameOrEmail, loginPassword)
                            isLoading = false
                            if (res.isSuccess) {
                                onLoginSuccess(res.getOrNull()?.token ?: "SESSION_DEFAULT")
                            } else {
                                errorMessage = res.exceptionOrNull()?.message ?: "Login failed"
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    enabled = !isLoading,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                    } else {
                        Text("Sign In to DivyaDrishti", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Demo Quick Fill Helper (Fills fields only, does not auto-login)
                OutlinedButton(
                    onClick = {
                        loginUsernameOrEmail = "sahana"
                        loginPassword = "password123"
                        errorMessage = null
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.FlashOn, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Fill Demo Account Credentials")
                }
            }

            // ==================== TAB 1: SIGN UP ====================
            else {
                OutlinedTextField(
                    value = regName,
                    onValueChange = { regName = it },
                    label = { Text("Full Name") },
                    leadingIcon = { Icon(Icons.Default.Badge, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = regUsername,
                    onValueChange = { regUsername = it },
                    label = { Text("Username") },
                    leadingIcon = { Icon(Icons.Default.AccountCircle, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = regEmail,
                    onValueChange = { regEmail = it },
                    label = { Text("Email Address") },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = regPhone,
                    onValueChange = { regPhone = it },
                    label = { Text("Phone Number") },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = regBloodGroup,
                        onValueChange = { regBloodGroup = it },
                        label = { Text("Blood Group") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = regVehicle,
                        onValueChange = { regVehicle = it },
                        label = { Text("Vehicle Reg #") },
                        singleLine = true,
                        modifier = Modifier.weight(1.5f)
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = regPassword,
                    onValueChange = { regPassword = it },
                    label = { Text("Password (min 6 chars)") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                    trailingIcon = {
                        IconButton(onClick = { regPasswordVisible = !regPasswordVisible }) {
                            Icon(
                                imageVector = if (regPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = "Toggle password"
                            )
                        }
                    },
                    visualTransformation = if (regPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = regConfirmPassword,
                    onValueChange = { regConfirmPassword = it },
                    label = { Text("Confirm Password") },
                    leadingIcon = { Icon(Icons.Default.LockReset, contentDescription = null) },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        if (regPassword != regConfirmPassword) {
                            errorMessage = "Passwords do not match"
                            return@Button
                        }
                        isLoading = true
                        errorMessage = null
                        scope.launch {
                            val res = authRepo.register(
                                name = regName,
                                username = regUsername,
                                email = regEmail,
                                password = regPassword,
                                phoneNumber = regPhone,
                                bloodGroup = regBloodGroup,
                                vehicleNumber = regVehicle
                            )
                            isLoading = false
                            if (res.isSuccess) {
                                onLoginSuccess(res.getOrNull()?.token ?: "SESSION_NEW")
                            } else {
                                errorMessage = res.exceptionOrNull()?.message ?: "Registration failed"
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    enabled = !isLoading,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                    } else {
                        Text("Create Account & Start", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "100% Offline-First • Autonomous Device AI • Low Power Mode",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                textAlign = TextAlign.Center
            )
        }
    }
}
