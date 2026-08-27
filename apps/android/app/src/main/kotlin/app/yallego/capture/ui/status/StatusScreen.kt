package app.yallego.capture.ui.status

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.rounded.BatterySaver
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.CloudQueue
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.yallego.capture.R
import app.yallego.capture.ui.components.IconBadge
import app.yallego.capture.ui.components.ScreenEyebrow
import app.yallego.capture.ui.components.YallegoBackdrop
import app.yallego.capture.ui.components.YallegoBrandHeader
import app.yallego.capture.ui.components.YallegoCard
import app.yallego.capture.ui.theme.AppBlue
import app.yallego.capture.ui.theme.AppBorder
import app.yallego.capture.ui.theme.AppCyan
import app.yallego.capture.ui.theme.AppSurfaceElevated
import app.yallego.capture.ui.theme.AppTextSecondary
import app.yallego.capture.ui.theme.AppTextTertiary
import app.yallego.capture.ui.theme.DangerBright
import app.yallego.capture.ui.theme.SuccessBright
import app.yallego.capture.ui.theme.WarningBright
import java.text.DateFormat
import java.util.Date

@Composable
fun StatusScreen(state: StatusUiState) {
    val businessName = state.businessName?.takeIf { it.isNotBlank() }
        ?: stringResource(R.string.business_fallback)

    YallegoBackdrop {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
        ) {
            YallegoBrandHeader(trailingLabel = stringResource(R.string.status_monitoring_label))
            Spacer(Modifier.height(34.dp))
            ScreenEyebrow(stringResource(R.string.status_eyebrow))
            Spacer(Modifier.height(10.dp))
            Text(
                text = stringResource(R.string.status_greeting, businessName),
                color = Color.White,
                style = MaterialTheme.typography.headlineLarge,
            )
            Text(
                text = stringResource(R.string.status_subtitle),
                color = AppTextSecondary,
                style = MaterialTheme.typography.bodyLarge,
            )
            Spacer(Modifier.height(24.dp))

            OperationalHero(state.operationalStatus)
            Spacer(Modifier.height(14.dp))

            Row(Modifier.fillMaxWidth()) {
                StatusMetricCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Rounded.Schedule,
                    label = stringResource(R.string.status_last_heartbeat),
                    value = state.lastHeartbeatAtEpochMs?.let { formatTimestamp(it) }
                        ?: stringResource(R.string.status_never),
                    accent = AppCyan,
                )
                Spacer(Modifier.size(10.dp))
                StatusMetricCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Rounded.CloudQueue,
                    label = stringResource(R.string.status_queue_label),
                    value = state.queueSize.toString(),
                    accent = AppBlue,
                )
            }

            Spacer(Modifier.height(26.dp))
            Text(
                text = stringResource(R.string.status_configuration_title),
                color = Color.White,
                style = MaterialTheme.typography.titleLarge,
            )
            Text(
                text = stringResource(R.string.status_configuration_body),
                color = AppTextTertiary,
                style = MaterialTheme.typography.bodySmall,
            )
            Spacer(Modifier.height(14.dp))

            ConfigurationRow(
                icon = Icons.Rounded.NotificationsActive,
                label = stringResource(R.string.status_notifications_label),
                detail = if (state.notificationAccessGranted) {
                    stringResource(R.string.status_permission_ready)
                } else {
                    stringResource(R.string.status_permission_missing)
                },
                ready = state.notificationAccessGranted,
            )
            Spacer(Modifier.height(10.dp))
            ConfigurationRow(
                icon = Icons.Rounded.BatterySaver,
                label = stringResource(R.string.status_battery_label),
                detail = if (state.batteryOptimizationDisabled) {
                    stringResource(R.string.status_battery_ready)
                } else {
                    stringResource(R.string.status_battery_missing)
                },
                ready = state.batteryOptimizationDisabled,
            )

            Spacer(Modifier.height(18.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppBlue.copy(alpha = 0.09f), MaterialTheme.shapes.medium)
                    .border(1.dp, AppBlue.copy(alpha = 0.18f), MaterialTheme.shapes.medium)
                    .padding(15.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconBadge(Icons.Rounded.Shield, tint = AppCyan, size = 42)
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Text(
                        text = stringResource(R.string.status_background_title),
                        color = Color.White,
                        style = MaterialTheme.typography.labelLarge,
                    )
                    Text(
                        text = stringResource(R.string.status_background_body),
                        color = AppTextSecondary,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
        }
    }
}

@Composable
private fun OperationalHero(status: OperationalStatus) {
    val color = statusColor(status)
    val label = statusLabel(status)
    val description = when (status) {
        OperationalStatus.ACTIVE -> stringResource(R.string.status_active_body)
        OperationalStatus.WARNING -> stringResource(R.string.status_warning_body)
        OperationalStatus.STOPPED -> stringResource(R.string.status_stopped_body)
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.Transparent,
        shape = MaterialTheme.shapes.large,
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.28f)),
    ) {
        Column(
            modifier = Modifier
                .background(
                    Brush.linearGradient(
                        listOf(color.copy(alpha = 0.2f), AppSurfaceElevated, AppSurfaceElevated),
                    ),
                )
                .padding(22.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(color.copy(alpha = 0.15f), CircleShape)
                        .border(1.dp, color.copy(alpha = 0.25f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = if (status == OperationalStatus.ACTIVE) {
                            Icons.Rounded.CloudDone
                        } else {
                            Icons.Rounded.Bolt
                        },
                        contentDescription = null,
                        tint = color,
                        modifier = Modifier.size(27.dp),
                    )
                }
                Column(Modifier.padding(start = 14.dp).weight(1f)) {
                    Text(
                        text = stringResource(R.string.status_connection_label),
                        color = AppTextTertiary,
                        style = MaterialTheme.typography.labelSmall,
                    )
                    Text(label, color = Color.White, style = MaterialTheme.typography.titleLarge)
                }
                StatusBadge(status)
            }
            Spacer(Modifier.height(18.dp))
            Text(description, color = AppTextSecondary, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun StatusMetricCard(
    modifier: Modifier,
    icon: ImageVector,
    label: String,
    value: String,
    accent: Color,
) {
    YallegoCard(modifier = modifier.height(142.dp)) {
        Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(20.dp))
        Spacer(Modifier.height(16.dp))
        Text(label, color = AppTextTertiary, style = MaterialTheme.typography.labelSmall)
        Spacer(Modifier.height(3.dp))
        Text(
            text = value,
            color = Color.White,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
        )
    }
}

@Composable
private fun ConfigurationRow(icon: ImageVector, label: String, detail: String, ready: Boolean) {
    YallegoCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(
                icon = icon,
                tint = if (ready) SuccessBright else DangerBright,
                size = 44,
            )
            Column(Modifier.padding(horizontal = 12.dp).weight(1f)) {
                Text(label, color = Color.White, style = MaterialTheme.typography.labelLarge)
                Text(detail, color = AppTextSecondary, style = MaterialTheme.typography.bodySmall)
            }
            Box(
                modifier = Modifier
                    .size(27.dp)
                    .background(if (ready) SuccessBright else DangerBright.copy(alpha = 0.14f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                if (ready) {
                    Icon(
                        imageVector = Icons.Rounded.Check,
                        contentDescription = null,
                        tint = Color.Black,
                        modifier = Modifier.size(17.dp),
                    )
                } else {
                    Box(Modifier.size(7.dp).background(DangerBright, CircleShape))
                }
            }
        }
    }
}

@Composable
private fun StatusBadge(status: OperationalStatus) {
    val color = statusColor(status)
    Surface(color = color.copy(alpha = 0.12f), shape = CircleShape) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(7.dp).background(color, CircleShape))
            Text(
                text = statusLabel(status),
                modifier = Modifier.padding(start = 6.dp),
                color = color,
                style = MaterialTheme.typography.labelSmall,
            )
        }
    }
}

private fun statusColor(status: OperationalStatus): Color = when (status) {
    OperationalStatus.ACTIVE -> SuccessBright
    OperationalStatus.WARNING -> WarningBright
    OperationalStatus.STOPPED -> DangerBright
}

@Composable
private fun statusLabel(status: OperationalStatus): String = when (status) {
    OperationalStatus.ACTIVE -> stringResource(R.string.status_active)
    OperationalStatus.WARNING -> stringResource(R.string.status_warning)
    OperationalStatus.STOPPED -> stringResource(R.string.status_stopped)
}

private fun formatTimestamp(epochMs: Long): String =
    DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(epochMs))
