package app.yallego.capture.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.RocketLaunch
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.yallego.capture.R
import app.yallego.capture.ui.components.IconBadge
import app.yallego.capture.ui.components.PrimaryActionButton
import app.yallego.capture.ui.components.ProgressDots
import app.yallego.capture.ui.components.ScreenEyebrow
import app.yallego.capture.ui.components.SupportNote
import app.yallego.capture.ui.components.YallegoBackdrop
import app.yallego.capture.ui.components.YallegoBrandHeader
import app.yallego.capture.ui.components.YallegoCard
import app.yallego.capture.ui.theme.AppBlue
import app.yallego.capture.ui.theme.AppBorder
import app.yallego.capture.ui.theme.AppCyan
import app.yallego.capture.ui.theme.AppSurfaceElevated
import app.yallego.capture.ui.theme.AppTextSecondary
import app.yallego.capture.ui.theme.AppTextTertiary
import app.yallego.capture.ui.theme.SuccessBright

@Composable
fun ChecklistScreen(
    pairingDone: Boolean,
    notificationsGranted: Boolean,
    batteryGranted: Boolean,
    onFinish: () -> Unit,
) {
    val completed = listOf(pairingDone, notificationsGranted, batteryGranted).count { it }

    YallegoBackdrop {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
        ) {
            YallegoBrandHeader(trailingLabel = stringResource(R.string.step_four_of_four))
            Spacer(Modifier.height(34.dp))
            ProgressDots(current = 3, total = 4)
            Spacer(Modifier.height(28.dp))
            ScreenEyebrow(stringResource(R.string.checklist_eyebrow))
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.checklist_title),
                color = Color.White,
                style = MaterialTheme.typography.headlineLarge,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = stringResource(R.string.checklist_body),
                color = AppTextSecondary,
                style = MaterialTheme.typography.bodyLarge,
            )
            Spacer(Modifier.height(24.dp))

            YallegoCard(modifier = Modifier.fillMaxWidth(), elevated = true) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = completed.toString(),
                        color = Color.White,
                        style = MaterialTheme.typography.displaySmall,
                    )
                    Text(
                        text = stringResource(R.string.checklist_progress_total),
                        modifier = Modifier.padding(start = 4.dp, bottom = 4.dp),
                        color = AppTextTertiary,
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        text = if (completed == 3) {
                            stringResource(R.string.checklist_ready)
                        } else {
                            stringResource(R.string.checklist_pending)
                        },
                        color = if (completed == 3) SuccessBright else AppCyan,
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
                Spacer(Modifier.height(16.dp))
                Row(Modifier.fillMaxWidth()) {
                    repeat(3) { index ->
                        Box(
                            modifier = Modifier
                                .padding(end = if (index < 2) 6.dp else 0.dp)
                                .weight(1f)
                                .height(5.dp)
                                .background(
                                    if (index < completed) SuccessBright else AppBorder,
                                    CircleShape,
                                ),
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            ChecklistRow(
                label = stringResource(R.string.checklist_item_pairing),
                detail = stringResource(R.string.checklist_item_pairing_detail),
                done = pairingDone,
                icon = Icons.Rounded.Link,
            )
            Spacer(Modifier.height(10.dp))
            ChecklistRow(
                label = stringResource(R.string.checklist_item_notifications),
                detail = stringResource(R.string.checklist_item_notifications_detail),
                done = notificationsGranted,
                icon = Icons.Rounded.NotificationsActive,
            )
            Spacer(Modifier.height(10.dp))
            ChecklistRow(
                label = stringResource(R.string.checklist_item_battery),
                detail = stringResource(R.string.checklist_item_battery_detail),
                done = batteryGranted,
                icon = Icons.Rounded.Shield,
            )

            Spacer(Modifier.height(18.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppBlue.copy(alpha = 0.1f), MaterialTheme.shapes.medium)
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconBadge(Icons.Rounded.Science, tint = AppCyan, size = 42)
                Text(
                    text = stringResource(R.string.checklist_test_hint),
                    modifier = Modifier.padding(start = 12.dp).weight(1f),
                    color = AppTextSecondary,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Spacer(Modifier.height(20.dp))
            PrimaryActionButton(
                text = stringResource(R.string.checklist_finish_cta),
                onClick = onFinish,
                leadingIcon = Icons.Rounded.RocketLaunch,
            )
            Spacer(Modifier.height(12.dp))
        }
    }
}

@Composable
private fun ChecklistRow(label: String, detail: String, done: Boolean, icon: ImageVector) {
    YallegoCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(
                icon = icon,
                tint = if (done) SuccessBright else AppTextTertiary,
                size = 44,
            )
            Column(Modifier.padding(horizontal = 12.dp).weight(1f)) {
                Text(label, color = Color.White, style = MaterialTheme.typography.labelLarge)
                Text(detail, color = AppTextSecondary, style = MaterialTheme.typography.bodySmall)
            }
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(
                        if (done) SuccessBright else AppSurfaceElevated,
                        CircleShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (done) {
                    Icon(
                        imageVector = Icons.Rounded.Check,
                        contentDescription = null,
                        tint = Color.Black,
                        modifier = Modifier.size(17.dp),
                    )
                } else {
                    Box(Modifier.size(7.dp).background(AppTextTertiary, CircleShape))
                }
            }
        }
    }
}
