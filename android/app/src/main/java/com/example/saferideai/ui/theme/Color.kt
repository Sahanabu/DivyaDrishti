package com.example.saferideai.ui.theme

import androidx.compose.ui.graphics.Color

// --- High-Contrast Dark Theme Palette ---
val DarkBackground = Color(0xFF090D16)          // Deep Cyber Obsidian
val DarkSurface = Color(0xFF111827)             // Elevated Card Surface
val DarkSurfaceElevated = Color(0xFF1F2937)     // Interactive Container
val DarkSurfaceBorder = Color(0xFF374151)       // Crisp Definition Border
val DarkTextPrimary = Color(0xFFF9FAFB)         // Maximum Contrast Crisp White
val DarkTextSecondary = Color(0xFF9CA3AF)       // Legible Slate Grey
val DarkTextMuted = Color(0xFF6B7280)           // Subtle Meta Info

// --- High-Contrast Light Theme Palette ---
val LightBackground = Color(0xFFF3F4F6)         // Clean Architectural Grey
val LightSurface = Color(0xFFFFFFFF)            // Pure Crisp White
val LightSurfaceElevated = Color(0xFFE5E7EB)    // Soft Elevated Container
val LightSurfaceBorder = Color(0xFFD1D5DB)      // Clear Definition Border
val LightTextPrimary = Color(0xFF111827)        // Maximum Contrast Deep Obsidian
val LightTextSecondary = Color(0xFF4B5563)      // Legible Charcoal Slate
val LightTextMuted = Color(0xFF9CA3AF)          // Subtle Meta Info

// --- Universal High-Visibility Cyber Status Colors ---
val PrimaryCyan = Color(0xFF06B6D4)             // Electric Cyan
val PrimaryCyanDark = Color(0xFF0891B2)
val SafeGreen = Color(0xFF10B981)               // Neon Emerald Safe
val SafeGreenDark = Color(0xFF059669)
val MonitoringYellow = Color(0xFFF59E0B)        // Amber Warning
val MonitoringYellowDark = Color(0xFFD97706)
val DangerRed = Color(0xFFEF4444)               // High-Visibility Crimson
val DangerRedDark = Color(0xFFDC2626)
val SosRed = Color(0xFFDC2626)
val AccentPurple = Color(0xFF8B5CF6)            // Cyber Violet Accent

// Backward-compatible aliases
val PrimaryDark = DarkSurface
val SecondaryDark = DarkSurfaceElevated
val BackgroundDark = DarkBackground
val SurfaceDark = DarkSurface
val TextPrimary = DarkTextPrimary
val TextSecondary = DarkTextSecondary
val AccentBlue = PrimaryCyan
