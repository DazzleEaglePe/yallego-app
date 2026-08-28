package app.yallego.capture.ui.status

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
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.yallego.capture.R
import app.yallego.capture.ui.components.IconBadge
import app.yallego.capture.ui.components.ScreenEyebrow
import app.yallego.capture.ui.components.YallegoBackdrop
import app.yallego.capture.ui.components.YallegoBrandHeader
import app.yallego.capture.ui.components.YallegoCard
import app.yallego.capture.ui.theme.AppBorder
import app.yallego.capture.ui.theme.AppBlueBright
import app.yallego.capture.ui.theme.AppSurface
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
            //YallegoBrandHeader(trailingLabel = stringResource(R.string.status_monitoring_label))
            Spacer(Modifier.height(38.dp))
            ScreenEyebrow(stringResource(R.string.status_eyebrow))
            Spacer(Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.status_greeting, businessName),
                color = Color.White,
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                text = stringResource(R.string.status_subtitle),
                color = AppTextSecondary,
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(Modifier.height(24.dp))

            OperationalHero(state.operationalStatus)
            Spacer(Modifier.height(28.dp))
            Text(
                text = stringResource(R.string.status_summary_title),
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(12.dp))
            StatusSummary(
                lastHeartbeat = state.lastHeartbeatAtEpochMs?.let { formatTimestamp(it) }
                    ?: stringResource(R.string.status_never),
                queueSize = state.queueSize,
            )

            Spacer(Modifier.height(28.dp))
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
            Spacer(Modifier.height(12.dp))
            YallegoCard(modifier = Modifier.fillMaxWidth()) {
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
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 14.dp)
                        .height(1.dp)
                        .background(AppBorder),
                )
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
            }

            Spacer(Modifier.height(22.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                //IconBadge(Icons.Rounded.Shield, tint = AppBlueBright, size = 40)
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
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

    Surface(modifier = Modifier.fillMaxWidth(), color = AppSurface, shape = MaterialTheme.shapes.large) {
        Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(44.dp).background(color.copy(alpha = 0.13f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = if (status == OperationalStatus.ACTIVE) Icons.Rounded.CloudDone else Icons.Rounded.Bolt,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(22.dp),
                )
            }
            Column(Modifier.padding(start = 14.dp).weight(1f)) {
                Text(label, color = Color.White, style = MaterialTheme.typography.titleMedium)
                Text(description, color = AppTextSecondary, style = MaterialTheme.typography.bodySmall)
            }
            Box(Modifier.size(8.dp).background(color, CircleShape))
        }
    }
}

@Composable
private fun StatusSummary(lastHeartbeat: String, queueSize: Int) {
    YallegoCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            SummaryValue(
                modifier = Modifier.weight(1f),
                icon = Icons.Rounded.Schedule,
                label = stringResource(R.string.status_last_heartbeat),
                value = lastHeartbeat,
            )
            Box(Modifier.width(1.dp).height(54.dp).background(AppBorder))
            SummaryValue(
                modifier = Modifier.padding(start = 18.dp).weight(0.65f),
                icon = Icons.Rounded.CloudQueue,
                label = stringResource(R.string.status_queue_label),
                value = queueSize.toString(),
            )
        }
    }
}

@Composable
private fun SummaryValue(modifier: Modifier, icon: ImageVector, label: String, value: String) {
    Column(modifier) {
        Icon(icon, contentDescription = null, tint = AppBlueBright, modifier = Modifier.size(18.dp))
        Spacer(Modifier.height(10.dp))
        Text(label, color = AppTextTertiary, style = MaterialTheme.typography.labelSmall)
        Text(value, color = Color.White, style = MaterialTheme.typography.titleMedium, maxLines = 2)
    }
}

@Composable
private fun ConfigurationRow(icon: ImageVector, label: String, detail: String, ready: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (ready) SuccessBright else DangerBright,
            modifier = Modifier.size(20.dp),
        )
        Column(Modifier.padding(horizontal = 13.dp).weight(1f)) {
            Text(label, color = Color.White, style = MaterialTheme.typography.labelLarge)
            Text(detail, color = AppTextSecondary, style = MaterialTheme.typography.bodySmall)
        }
        Box(
            modifier = Modifier
                .size(24.dp)
                .background(if (ready) SuccessBright.copy(alpha = 0.13f) else DangerBright.copy(alpha = 0.13f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (ready) {
                Icon(Icons.Rounded.Check, null, tint = SuccessBright, modifier = Modifier.size(15.dp))
            } else {
                Box(Modifier.size(6.dp).background(DangerBright, CircleShape))
            }
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
