package com.example.saferideai.data.local

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query

@Entity(tableName = "speed_logs")
data class SpeedLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val speed: Float,
    val lat: Double,
    val lng: Double,
    val timestamp: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)

@Dao
interface SpeedLogDao {
    @Insert
    suspend fun insertSpeedLog(log: SpeedLogEntity)

    @Query("SELECT * FROM speed_logs WHERE isSynced = 0")
    suspend fun getUnsyncedLogs(): List<SpeedLogEntity>

    @Query("UPDATE speed_logs SET isSynced = 1 WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<Int>)
    
    @Query("DELETE FROM speed_logs WHERE isSynced = 1")
    suspend fun deleteSyncedLogs()
}
