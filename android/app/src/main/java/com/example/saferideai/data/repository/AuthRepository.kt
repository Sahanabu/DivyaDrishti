package com.example.saferideai.data.repository

import com.example.saferideai.data.UserManager
import com.example.saferideai.data.local.AppDatabase
import com.example.saferideai.data.local.EmergencyContactEntity
import com.example.saferideai.data.local.UserEntity
import com.example.saferideai.util.SecurityHelper
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class AuthRepository(
    private val database: AppDatabase,
    private val userManager: UserManager
) {
    private val userDao = database.userDao()
    private val contactDao = database.emergencyContactDao()

    val currentUser: Flow<UserEntity?> = userDao.getActiveUser()

    suspend fun initDefaultDataIfEmpty() {
        val existing = userDao.getFirstUser()
        if (existing == null) {
            val demoUser = UserEntity(
                id = "RIDER_DIVYA_01",
                username = "sahana",
                email = "sahana@divyadrishti.io",
                passwordHash = SecurityHelper.hashPassword("password123"),
                name = "Sahana",
                phoneNumber = "+91 9876543210",
                bloodGroup = "O+",
                vehicleNumber = "KA 28 HM 8281",
                medicalNotes = "No allergies | Helmet: Full-face ECE 22.06",
                token = "DEMO_SESSION_TOKEN_DIVYADRISHTI",
                isLoggedIn = false
            )
            userDao.insertUser(demoUser)
        }

        if (contactDao.getCount() == 0) {
            contactDao.insertContact(
                EmergencyContactEntity(
                    name = "Emergency Contact (Home)",
                    phoneNumber = "+91 8904791552",
                    relationship = "Family",
                    isPrimary = true
                )
            )
            contactDao.insertContact(
                EmergencyContactEntity(
                    name = "Emergency Medical Helpline",
                    phoneNumber = "108",
                    relationship = "Ambulance",
                    isPrimary = false
                )
            )
        }
    }

    suspend fun login(emailOrUsername: String, password: String): Result<UserEntity> {
        val cleanInput = emailOrUsername.trim()
        if (cleanInput.isEmpty() || password.isEmpty()) {
            return Result.failure(IllegalArgumentException("Please enter both username/email and password"))
        }

        val user = userDao.getUserByEmailOrUsername(cleanInput)
            ?: return Result.failure(IllegalArgumentException("User not found with '$cleanInput'"))

        val isPasswordValid = SecurityHelper.verifyPassword(password, user.passwordHash)
        if (!isPasswordValid) {
            return Result.failure(IllegalArgumentException("Incorrect password. Please try again."))
        }

        userDao.logoutAllUsers()
        val loggedInUser = user.copy(isLoggedIn = true)
        userDao.updateUser(loggedInUser)

        userManager.saveSession(
            id = loggedInUser.id,
            name = loggedInUser.name,
            email = loggedInUser.email,
            token = loggedInUser.token.ifEmpty { "SESSION_${UUID.randomUUID()}" }
        )

        return Result.success(loggedInUser)
    }

    suspend fun register(
        name: String,
        username: String,
        email: String,
        password: String,
        phoneNumber: String,
        bloodGroup: String = "O+",
        vehicleNumber: String = "KA 28 HM 8281",
        medicalNotes: String = ""
    ): Result<UserEntity> {
        val cleanName = name.trim()
        val cleanUsername = username.trim().lowercase()
        val cleanEmail = email.trim().lowercase()
        val cleanPhone = phoneNumber.trim()

        if (cleanName.isEmpty()) return Result.failure(IllegalArgumentException("Full Name is required"))
        if (cleanUsername.length < 3) return Result.failure(IllegalArgumentException("Username must be at least 3 characters"))
        if (!SecurityHelper.isValidEmail(cleanEmail)) return Result.failure(IllegalArgumentException("Please enter a valid email address"))
        if (!SecurityHelper.isValidPassword(password)) return Result.failure(IllegalArgumentException("Password must be at least 6 characters"))
        if (cleanPhone.length < 10) return Result.failure(IllegalArgumentException("Please enter a valid 10-digit phone number"))

        val existingUser = userDao.getUserByEmailOrUsername(cleanUsername)
        if (existingUser != null) {
            return Result.failure(IllegalArgumentException("Username '$cleanUsername' is already taken"))
        }

        val existingEmail = userDao.getUserByEmailOrUsername(cleanEmail)
        if (existingEmail != null) {
            return Result.failure(IllegalArgumentException("Account with email '$cleanEmail' already exists"))
        }

        val newUser = UserEntity(
            id = "RIDER_${UUID.randomUUID().toString().take(8).uppercase()}",
            username = cleanUsername,
            email = cleanEmail,
            passwordHash = SecurityHelper.hashPassword(password),
            name = cleanName,
            phoneNumber = cleanPhone,
            bloodGroup = bloodGroup,
            vehicleNumber = vehicleNumber.trim().uppercase(),
            medicalNotes = medicalNotes.trim().ifEmpty { "None" },
            token = "SESSION_${UUID.randomUUID()}",
            isLoggedIn = true
        )

        userDao.logoutAllUsers()
        userDao.insertUser(newUser)

        userManager.saveSession(
            id = newUser.id,
            name = newUser.name,
            email = newUser.email,
            token = newUser.token
        )

        return Result.success(newUser)
    }

    suspend fun logout() {
        userDao.logoutAllUsers()
        userManager.clearSession()
    }
}
