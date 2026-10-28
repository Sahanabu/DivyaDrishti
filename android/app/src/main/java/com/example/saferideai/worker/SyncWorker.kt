package com.example.saferideai.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.saferideai.data.UserManager
import com.example.saferideai.data.local.AppDatabase
import com.example.saferideai.network.ApiClient
import com.example.saferideai.network.AlertRequest
import com.example.saferideai.network.SpeedRequest
import kotlinx.coroutines.flow.firstOrNull

class SyncWorker(appContext: Context, workerParams: WorkerParameters) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(applicationContext)
        val userManager = UserManager(applicationContext)
        val token = userManager.userToken.firstOrNull() ?: return Result.success()

        val unsyncedSpeedLogs = database.speedLogDao().getUnsyncedLogs()
        val unsyncedAlerts = database.alertDao().getUnsyncedAlerts()

        var allSynced = true

        if (unsyncedSpeedLogs.isNotEmpty()) {
            val syncedIds = mutableListOf<Int>()
            for (log in unsyncedSpeedLogs) {
                try {
                    ApiClient.apiService.updateSpeed(
                        token,
                        SpeedRequest(speed = log.speed, lat = log.lat, lng = log.lng)
                    )
                    syncedIds.add(log.id)
                } catch (e: Exception) {
                    allSynced = false
                }
            }
            if (syncedIds.isNotEmpty()) {
                database.speedLogDao().markAsSynced(syncedIds)
            }
        }

        if (unsyncedAlerts.isNotEmpty()) {
            val syncedAlertIds = mutableListOf<Int>()
            for (alert in unsyncedAlerts) {
                try {
                    ApiClient.apiService.triggerAlert(
                        token,
                        AlertRequest(lat = alert.lat, lng = alert.lng)
                    )
                    syncedAlertIds.add(alert.id)
                } catch (e: Exception) {
                    allSynced = false
                }
            }
            if (syncedAlertIds.isNotEmpty()) {
                database.alertDao().markAsSynced(syncedAlertIds)
            }
        }

        return if (allSynced) Result.success() else Result.retry()
    }
}
