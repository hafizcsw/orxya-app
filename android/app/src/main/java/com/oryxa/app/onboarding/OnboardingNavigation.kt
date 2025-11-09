package com.oryxa.app.onboarding

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

@Composable
fun OnboardingNav() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "welcome"
    ) {
        composable("welcome") {
            WelcomeScreen(
                onNext = { navController.navigate("auth") }
            )
        }

        composable("auth") {
            AuthScreen(
                onNext = { navController.navigate("health") }
            )
        }

        composable("health") {
            HealthConnectGrantScreen(
                onGranted = { navController.navigate("finance") }
            )
        }

        composable("finance") {
            NotificationAccessGrantScreen(
                onGranted = { navController.navigate("calendar") }
            )
        }

        composable("calendar") {
            GoogleCalendarConnectScreen(
                onConnected = { navController.navigate("baseline") }
            )
        }

        composable("baseline") {
            Baseline14DayScreen(
                onDone = { navController.navigate("ready") }
            )
        }

        composable("ready") {
            ReadyScreen(
                onContinue = {
                    // Navigate to main app (Today screen)
                    navController.navigate("today") {
                        popUpTo("welcome") { inclusive = true }
                    }
                }
            )
        }
    }
}
