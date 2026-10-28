package com.example.saferideai.services

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import com.example.saferideai.data.local.EmergencyContactEntity
import com.example.saferideai.data.local.UserEntity
import java.net.URLEncoder
import java.util.Locale

object EmergencyDispatcher {

    fun formatSosMessage(
        rider: UserEntity?,
        lat: Double,
        lng: Double,
        speedKmh: Float,
        hazardType: String = "IMPACT CRASH"
    ): String {
        val riderName = rider?.name?.ifEmpty { "DivyaDrishti Rider" } ?: "DivyaDrishti Rider"
        val vehicle = rider?.vehicleNumber?.ifEmpty { "KA 28 HM 8281" } ?: "KA 28 HM 8281"
        val blood = rider?.bloodGroup?.ifEmpty { "O+" } ?: "O+"
        val notes = rider?.medicalNotes ?: "None"
        val latStr = String.format(Locale.US, "%.6f", lat)
        val lngStr = String.format(Locale.US, "%.6f", lng)

        return """
            EMERGENCY ALERT! DivyaDrishti detected a motorcycle $hazardType.
            Rider: $riderName
            Vehicle: $vehicle | Blood Group: $blood
            Location: https://maps.google.com/?q=$latStr,$lngStr
            Speed at event: ${speedKmh.toInt()} km/h
            Medical info: $notes
            Please dispatch immediate medical assistance!
        """.trimIndent()
    }

    /**
     * Completely independent on-device SMS dispatch using local cellular modem.
     * Operates 100% offline without requiring internet or an external server.
     * Falls back to native SMS intent if runtime permission is not granted.
     */
    fun dispatchDirectSms(
        context: Context,
        contacts: List<EmergencyContactEntity>,
        message: String
    ): Int {
        if (contacts.isEmpty()) return 0
        var sentCount = 0

        val hasSmsPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED

        val smsManager: SmsManager? = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }
        } catch (e: Exception) {
            null
        }

        for (contact in contacts) {
            val phone = contact.phoneNumber.filter { it.isDigit() || it == '+' }
            if (phone.isNotBlank()) {
                var dispatched = false
                if (hasSmsPermission && smsManager != null) {
                    try {
                        val parts = smsManager.divideMessage(message)
                        smsManager.sendMultipartTextMessage(phone, null, parts, null, null)
                        sentCount++
                        dispatched = true
                    } catch (e: Exception) {
                        try {
                            val shortMsg = message.take(155)
                            smsManager.sendTextMessage(phone, null, shortMsg, null, null)
                            sentCount++
                            dispatched = true
                        } catch (e2: Exception) {}
                    }
                }
                if (!dispatched) {
                    launchSmsIntent(context, phone, message)
                    sentCount++
                }
            }
        }
        return sentCount
    }

    fun launchSmsIntent(context: Context, phone: String, message: String) {
        try {
            val intent = Intent(Intent.ACTION_SENDTO).apply {
                data = Uri.parse("smsto:$phone")
                putExtra("sms_body", message)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {}
    }

    /**
     * 1-Click WhatsApp Lifeline URL prefilled with exact location & rider info.
     * Automatically prepends international country code if a 10-digit national number is passed.
     */
    fun getWhatsAppSosUrl(phone: String, message: String): String {
        var cleanPhone = phone.filter { it.isDigit() }
        if (cleanPhone.length == 10 && cleanPhone.first() in listOf('6', '7', '8', '9')) {
            cleanPhone = "91$cleanPhone"
        }
        val encodedMsg = URLEncoder.encode(message, "UTF-8")
        return "https://api.whatsapp.com/send?phone=$cleanPhone&text=$encodedMsg"
    }

    fun getWhatsAppIntent(phone: String, message: String): Intent {
        val uri = Uri.parse(getWhatsAppSosUrl(phone, message))
        return Intent(Intent.ACTION_VIEW, uri).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
    }

    /**
     * Auto-navigation to Nearest Hospital & Emergency Room
     */
    fun getNearestHospitalGeoUri(lat: Double, lng: Double): String {
        return if (lat != 0.0 && lng != 0.0) {
            "geo:$lat,$lng?q=hospital+emergency+room"
        } else {
            "geo:0,0?q=hospital+emergency+room"
        }
    }

    fun getNearestHospitalIntent(lat: Double, lng: Double): Intent {
        val geoUri = Uri.parse(getNearestHospitalGeoUri(lat, lng))
        return Intent(Intent.ACTION_VIEW, geoUri).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
    }

    /**
     * Direct Phone Call Intent to Primary Contact
     */
    fun getCallContactIntent(phone: String): Intent {
        val uri = Uri.parse("tel:${phone.trim()}")
        return Intent(Intent.ACTION_DIAL, uri).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
    }
}
