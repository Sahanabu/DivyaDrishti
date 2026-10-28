package com.example.saferideai.services

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.example.saferideai.MainActivity
import com.example.saferideai.R

class MonitoringService : Service() {

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == ACTION_START_MONITORING) {
            startForegroundService()
        } else if (action == ACTION_STOP_MONITORING) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
        return START_STICKY
    }

    private fun startForegroundService() {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = NotificationCompat.Builder(this, "monitoring_channel")
            .setContentTitle("DivyaDrishti Safety Active")
            .setContentText("AI crash, fall & accident monitoring engaged (Low Power Mode)")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(
                this,
                1,
                notification,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                } else {
                    0
                }
            )
        } else {
            startForeground(1, notification)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    companion object {
        const val ACTION_START_MONITORING = "ACTION_START_MONITORING"
        const val ACTION_STOP_MONITORING = "ACTION_STOP_MONITORING"
    }
}
