package com.oryxa.app.onboarding

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun WelcomeScreen(onNext: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Spacer(modifier = Modifier.height(48.dp))

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "مرحبًا بك في Oryxa",
                style = MaterialTheme.typography.headlineLarge,
                textAlign = TextAlign.Center
            )

            Text(
                text = "مساعدك الذكي للصحة والإنتاجية والمالية",
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Features list
            OnboardingFeatureItem(
                icon = "💚",
                title = "تتبع صحي ذكي",
                description = "مزامنة تلقائية مع Health Connect"
            )

            OnboardingFeatureItem(
                icon = "💰",
                title = "إدارة مالية",
                description = "تتبع تلقائي للمصروفات عبر الإشعارات"
            )

            OnboardingFeatureItem(
                icon = "📅",
                title = "تخطيط وتقويم",
                description = "مزامنة مع Google Calendar"
            )

            OnboardingFeatureItem(
                icon = "🤖",
                title = "توصيات ذكية",
                description = "نصائح شخصية بناءً على بياناتك"
            )
        }

        Button(
            onClick = onNext,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("ابدأ الآن")
        }
    }
}

@Composable
fun OnboardingFeatureItem(
    icon: String,
    title: String,
    description: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = icon,
            style = MaterialTheme.typography.headlineMedium
        )

        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
