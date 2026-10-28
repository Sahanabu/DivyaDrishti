package com.example.saferideai.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "trips")
data class TripEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val startTime: Long = System.currentTimeMillis(),
    val endTime: Long = 0L,
    val distanceKm: Float = 0f,
    val maxSpeedKmh: Float = 0f,
    val avgSpeedKmh: Float = 0f,
    val safetyScore: Int = 100,
    val grade: String = "A+",
    val incidentsCount: Int = 0,
    val isCompleted: Boolean = false
)

@Dao
interface TripDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTrip(trip: TripEntity): Long

    @Update
    suspend fun updateTrip(trip: TripEntity)

    @Query("SELECT * FROM trips ORDER BY id DESC")
    fun getAllTrips(): Flow<List<TripEntity>>

    @Query("SELECT * FROM trips WHERE isCompleted = 0 ORDER BY id DESC LIMIT 1")
    suspend fun getActiveTrip(): TripEntity?

    @Query("SELECT * FROM trips ORDER BY id DESC LIMIT 1")
    suspend fun getLatestTrip(): TripEntity?

    @Query("DELETE FROM trips")
    suspend fun clearAllTrips()
}
