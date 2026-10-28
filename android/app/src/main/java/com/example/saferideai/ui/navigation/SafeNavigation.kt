package com.example.saferideai.ui.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Auth : Screen("auth")
    object Onboarding : Screen("onboarding")
    object Permissions : Screen("permissions")
    object Dashboard : Screen("dashboard")
    object Emergency : Screen("emergency")
    object Map : Screen("map")
    object History : Screen("history")
    object Settings : Screen("settings")
}
