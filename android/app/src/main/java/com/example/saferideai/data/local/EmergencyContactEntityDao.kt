package com.example.saferideai.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "emergency_contacts")
data class EmergencyContactEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val phoneNumber: String,
    val relationship: String = "Family",
    val isPrimary: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface EmergencyContactDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertContact(contact: EmergencyContactEntity): Long

    @Update
    suspend fun updateContact(contact: EmergencyContactEntity)

    @Delete
    suspend fun deleteContact(contact: EmergencyContactEntity)

    @Query("DELETE FROM emergency_contacts WHERE id = :id")
    suspend fun deleteById(id: Int)

    @Query("SELECT * FROM emergency_contacts ORDER BY isPrimary DESC, id ASC")
    fun getAllContacts(): Flow<List<EmergencyContactEntity>>

    @Query("SELECT * FROM emergency_contacts ORDER BY isPrimary DESC, id ASC")
    suspend fun getContactList(): List<EmergencyContactEntity>

    @Query("SELECT COUNT(*) FROM emergency_contacts")
    suspend fun getCount(): Int

    @Query("UPDATE emergency_contacts SET isPrimary = 0")
    suspend fun clearPrimaryStatus()

    @Query("UPDATE emergency_contacts SET isPrimary = 1 WHERE id = :id")
    suspend fun setPrimary(id: Int)

    @Transaction
    suspend fun setPrimaryContact(id: Int) {
        clearPrimaryStatus()
        setPrimary(id)
    }
}
