package com.example.saferideai.data.repository

import com.example.saferideai.data.local.AppDatabase
import com.example.saferideai.data.local.SpeedLogEntity
import com.example.saferideai.data.local.AlertEntity

class DataRepository(private val database: AppDatabase) {
    suspend fun addSpeedLog(speed: Float, lat: Double, lng: Double) {
        val entity = SpeedLogEntity(speed = speed, lat = lat, lng = lng)
        database.speedLogDao().insertSpeedLog(entity)
    }

    suspend fun addAlert(lat: Double, lng: Double) {
        val entity = AlertEntity(lat = lat, lng = lng)
        database.alertDao().insertAlert(entity)
    }
}
