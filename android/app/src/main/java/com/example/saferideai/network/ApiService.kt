package com.example.saferideai.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Header

interface ApiService {
    @POST("auth/send-otp")
    suspend fun sendOtp(@Body request: Map<String, String>): Map<String, String>

    @POST("auth/login")
    suspend fun verifyOtp(@Body request: Map<String, String>): LoginResponse

    @GET("auth/profile")
    suspend fun getProfile(@Header("Authorization") token: String): UserProfile

    @POST("speed/update")
    suspend fun updateSpeed(@Header("Authorization") token: String, @Body request: SpeedRequest): Any
    
    @POST("alert")
    suspend fun triggerAlert(@Header("Authorization") token: String, @Body request: AlertRequest): Any
}

data class LoginResponse(val token: String, val user: UserProfile, val isNewUser: Boolean)
data class UserProfile(val _id: String, val phoneNumber: String, val name: String, val emergencyContacts: List<Contact>? = emptyList())
data class Contact(val name: String, val phone: String)
data class SpeedRequest(val speed: Float, val lat: Double, val lng: Double)
data class AlertRequest(val lat: Double, val lng: Double)
