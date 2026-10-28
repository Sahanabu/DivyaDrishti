package com.example.saferideai.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "alerts")
data class AlertEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val eventType: String = "CRASH / COLLISION",
    val severity: String = "CRITICAL",
    val isSevere: Boolean = true,
    val rationale: String = "High-G collision impact detected",
    val speedKmh: Float = 0.0f,
    val gForce: Float = 1.0f,
    val gyroDegS: Float = 0.0f,
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val primaryRecipient: String = "",
    val recipientsCount: Int = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)

@Dao
interface AlertDao {
    @Insert
    suspend fun insertAlert(alert: AlertEntity): Long

    @Query("SELECT * FROM alerts ORDER BY timestamp DESC")
    fun getAllAlerts(): Flow<List<AlertEntity>>

    @Query("SELECT * FROM alerts ORDER BY timestamp DESC")
    suspend fun getAlertList(): List<AlertEntity>

    @Query("SELECT * FROM alerts WHERE isSynced = 0")
    suspend fun getUnsyncedAlerts(): List<AlertEntity>

    @Query("UPDATE alerts SET isSynced = 1 WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<Int>)

    @Query("DELETE FROM alerts WHERE id = :id")
    suspend fun deleteAlert(id: Int)

    @Query("DELETE FROM alerts")
    suspend fun clearAllAlerts()

    @Query("SELECT COUNT(*) FROM alerts")
    suspend fun getAlertsCount(): Int
}
