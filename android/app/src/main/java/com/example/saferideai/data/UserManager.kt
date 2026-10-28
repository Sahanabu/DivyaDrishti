package com.example.saferideai.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "divyadrishti_settings")

class UserManager(private val context: Context) {
    companion object {
        val JWT_TOKEN = stringPreferencesKey("jwt_token")
        val USER_ID = stringPreferencesKey("user_id")
        val USER_NAME = stringPreferencesKey("user_name")
        val USER_EMAIL = stringPreferencesKey("user_email")
        val IS_LOGGED_IN = booleanPreferencesKey("is_logged_in")
        val VOICE_ADAS_MUTED = booleanPreferencesKey("voice_adas_muted")
        val IS_DARK_THEME = booleanPreferencesKey("is_dark_theme")

        // Interactive hardware & real-world pocket settings
        val PHONE_PLACEMENT_MODE = stringPreferencesKey("phone_placement_mode") // "AUTO", "UPPER_POCKET", "PANT_POCKET", "HANDLEBAR_MOUNT"
        val SOS_COUNTDOWN_SECONDS = intPreferencesKey("sos_countdown_seconds") // 5, 10, 15
        val GYRO_SENSITIVITY = stringPreferencesKey("gyro_sensitivity") // "BALANCED", "HIGH_SENSITIVITY", "AGGRESSIVE"
        val AUTO_SMS_ENABLED = booleanPreferencesKey("auto_sms_enabled")
    }

    val userToken: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[JWT_TOKEN]
    }

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[IS_LOGGED_IN] ?: false
    }

    val userName: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[USER_NAME]
    }

    val isVoiceMuted: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[VOICE_ADAS_MUTED] ?: false
    }

    val isDarkTheme: Flow<Boolean?> = context.dataStore.data.map { preferences ->
        preferences[IS_DARK_THEME]
    }

    val phonePlacementMode: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[PHONE_PLACEMENT_MODE] ?: "AUTO"
    }

    val sosCountdownSeconds: Flow<Int> = context.dataStore.data.map { preferences ->
        preferences[SOS_COUNTDOWN_SECONDS] ?: 10
    }

    val gyroSensitivity: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[GYRO_SENSITIVITY] ?: "BALANCED"
    }

    val autoSmsEnabled: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[AUTO_SMS_ENABLED] ?: true
    }

    suspend fun saveSession(id: String, name: String, email: String, token: String) {
        context.dataStore.edit { preferences ->
            preferences[USER_ID] = id
            preferences[USER_NAME] = name
            preferences[USER_EMAIL] = email
            preferences[JWT_TOKEN] = token
            preferences[IS_LOGGED_IN] = true
        }
    }

    suspend fun saveUserName(name: String) {
        context.dataStore.edit { preferences ->
            preferences[USER_NAME] = name
        }
    }

    suspend fun saveToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[JWT_TOKEN] = token
            preferences[IS_LOGGED_IN] = true
        }
    }

    suspend fun setVoiceMuted(muted: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[VOICE_ADAS_MUTED] = muted
        }
    }

    suspend fun setDarkTheme(isDark: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[IS_DARK_THEME] = isDark
        }
    }

    suspend fun setPhonePlacementMode(mode: String) {
        context.dataStore.edit { preferences ->
            preferences[PHONE_PLACEMENT_MODE] = mode
        }
    }

    suspend fun setSosCountdownSeconds(seconds: Int) {
        context.dataStore.edit { preferences ->
            preferences[SOS_COUNTDOWN_SECONDS] = seconds
        }
    }

    suspend fun setGyroSensitivity(sensitivity: String) {
        context.dataStore.edit { preferences ->
            preferences[GYRO_SENSITIVITY] = sensitivity
        }
    }

    suspend fun setAutoSmsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[AUTO_SMS_ENABLED] = enabled
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { preferences ->
            preferences.remove(JWT_TOKEN)
            preferences.remove(USER_ID)
            preferences.remove(USER_NAME)
            preferences.remove(USER_EMAIL)
            preferences[IS_LOGGED_IN] = false
        }
    }
}
