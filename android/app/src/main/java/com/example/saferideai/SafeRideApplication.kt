package com.example.saferideai

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

class SafeRideApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = "monitoring_channel"
            val channelName = "SafeRide AI Monitoring"
            val channelDescription = "Active monitoring for accident detection"
            val importance = NotificationManager.IMPORTANCE_HIGH
            
            val channel = NotificationChannel(channelId, channelName, importance).apply {
                description = channelDescription
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
