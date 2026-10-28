package com.example.saferideai.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val username: String,
    val email: String,
    val passwordHash: String,
    val name: String,
    val phoneNumber: String,
    val bloodGroup: String = "O+",
    val vehicleNumber: String = "",
    val medicalNotes: String = "No known drug allergies",
    val token: String = "",
    val isLoggedIn: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface UserDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)

    @Update
    suspend fun updateUser(user: UserEntity)

    @Query("SELECT * FROM users WHERE LOWER(email) = LOWER(:emailOrUsername) OR LOWER(username) = LOWER(:emailOrUsername) LIMIT 1")
    suspend fun getUserByEmailOrUsername(emailOrUsername: String): UserEntity?

    @Query("SELECT * FROM users WHERE id = :id LIMIT 1")
    suspend fun getUserById(id: String): UserEntity?

    @Query("SELECT * FROM users WHERE isLoggedIn = 1 LIMIT 1")
    fun getActiveUser(): Flow<UserEntity?>

    @Query("SELECT * FROM users WHERE isLoggedIn = 1 LIMIT 1")
    suspend fun getActiveUserDirect(): UserEntity?

    @Query("SELECT * FROM users LIMIT 1")
    suspend fun getFirstUser(): UserEntity?

    @Query("SELECT * FROM users LIMIT 1")
    fun getUser(): Flow<UserEntity?>

    @Query("UPDATE users SET isLoggedIn = 0")
    suspend fun logoutAllUsers()

    @Query("UPDATE users SET isLoggedIn = :loggedIn WHERE id = :userId")
    suspend fun setUserLoggedIn(userId: String, loggedIn: Boolean)

    @Transaction
    suspend fun switchActiveUser(userId: String) {
        logoutAllUsers()
        setUserLoggedIn(userId, true)
    }

    @Query("DELETE FROM users")
    suspend fun clearUser()
}
