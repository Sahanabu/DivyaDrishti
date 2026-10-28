package com.example.saferideai.services

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

class VoiceAdasService(context: Context) : TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = TextToSpeech(context.applicationContext, this)
    private var isInitialized = false
    var isMuted: Boolean = false
    private var lastSpokenTime = 0L

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
            tts?.setSpeechRate(1.0f)
            isInitialized = true
        }
    }

    fun speak(text: String, isEmergency: Boolean = false) {
        if (isMuted && !isEmergency) return
        val now = System.currentTimeMillis()
        if (!isEmergency && (now - lastSpokenTime < 3500)) return
        lastSpokenTime = now

        if (isInitialized) {
            val queueMode = if (isEmergency) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
            tts?.speak(text, queueMode, null, "ADAS_ALERT_${now}")
        }
    }

    fun stop() {
        tts?.stop()
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
    }
}
