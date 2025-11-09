package com.oryxa.app.onboarding

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@Composable
fun Baseline14DayScreen(onDone: () -> Unit) {
    val scope = rememberCoroutineScope()
    var days by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                // Call today-realtime-data to get baseline_days_collected
                // This is a placeholder - implement actual API call
                days = fetchBaselineDaysFromEdge()
            } catch (e: Exception) {
                days = 0
            } finally {
                isLoading = false
            }
        }
    }

    val progress = (days / 14f).coerceIn(0f, 1f)
    val isComplete = days >= 14

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
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Text(
                text = "⚡",
                style = MaterialTheme.typography.displayLarge
            )

            Text(
                text = "خطّ الأساس الصحي",
                style = MaterialTheme.typography.headlineMedium,
                textAlign = TextAlign.Center
            )

            Text(
                text = if (isComplete) {
                    "رائع! اكتمل خطّ الأساس 🎉"
                } else {
                    "نحتاج ${14 - days} ${if (14 - days == 1) "يوم" else "أيام"} لإكمال خطّ الأساس"
                },
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "لماذا 14 يومًا؟",
                        style = MaterialTheme.typography.titleMedium
                    )

                    Text(
                        text = "نحتاج أسبوعين لفهم نمطك الطبيعي في معدل ضربات القلب (HRV) وبناء خط أساس شخصي دقيق. هذا يساعدنا على تقديم توصيات أفضل.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                </Column>
            }

            if (!isLoading) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    LinearProgressIndicator(
                        progress = progress,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                    )

                    Text(
                        text = "$days / 14 يومًا (${(progress * 100).toInt()}%)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.align(Alignment.End)
                    )
                </div>
            }
        }

        Button(
            onClick = onDone,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading
        ) {
            Text(if (isComplete) "متابعة" else "فهمت، متابعة")
        }
    }
}

// Placeholder function - implement actual API call
private suspend fun fetchBaselineDaysFromEdge(): Int {
    // TODO: Call /functions/v1/today-realtime-data
    // Parse response.health.baseline_days_collected
    return 0
}
