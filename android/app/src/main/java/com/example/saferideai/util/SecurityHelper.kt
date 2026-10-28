package com.example.saferideai.util

import java.security.MessageDigest

object SecurityHelper {
    private const val SALT = "DivyaDrishtiSecureAuthSalt2026"

    fun hashPassword(password: String): String {
        val input = password + SALT
        val md = MessageDigest.getInstance("SHA-256")
        val bytes = md.digest(input.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    fun verifyPassword(password: String, storedHash: String): Boolean {
        if (password.isBlank() || storedHash.isBlank()) return false
        val computed = hashPassword(password)
        return computed.equals(storedHash, ignoreCase = true)
    }

    private val EMAIL_REGEX = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\$".toRegex()

    fun isValidEmail(email: String): Boolean {
        val trimmed = email.trim()
        return trimmed.isNotEmpty() && EMAIL_REGEX.matches(trimmed)
    }

    fun isValidPassword(password: String): Boolean {
        return password.trim().length >= 6
    }
}
