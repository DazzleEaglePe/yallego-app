package app.yallego.capture.ui.main

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForwardIos
import androidx.compose.material.icons.automirrored.rounded.Launch
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.AdminPanelSettings
import androidx.compose.material.icons.rounded.BatterySaver
import androidx.compose.material.icons.rounded.Devices
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.ManageAccounts
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.yallego.capture.R
import app.yallego.capture.domain.model.MobileOverview
import app.yallego.capture.domain.model.MobileSubscription
import app.yallego.capture.ui.components.IconBadge
import app.yallego.capture.ui.components.PrimaryActionButton
import app.yallego.capture.ui.components.ScreenEyebrow
import app.yallego.capture.ui.components.YallegoBackdrop
import app.yallego.capture.ui.components.YallegoCard
import app.yallego.capture.ui.status.MobileOverviewState
import app.yallego.capture.ui.status.StatusUiState
import app.yallego.capture.ui.theme.AppBlueBright
import app.yallego.capture.ui.theme.AppSurfaceElevated
import app.yallego.capture.ui.theme.AppTextSecondary
import app.yallego.capture.ui.theme.AppTextTertiary
import java.text.DateFormat
import java.time.Instant
import java.util.Date

@Composable
fun MoreScreen(
    statusState: StatusUiState,
    overviewState: MobileOverviewState,
    onRefresh: () -> Unit,
    onOpenNotificationSettings: () -> Unit,
    onOpenBatterySettings: () -> Unit,
    onOpenAppSettings: () -> Unit,
    onOpenDashboard: () -> Unit,
    onOpenAccount: () -> Unit,
) {
    YallegoBackdrop {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = 22.dp,
                top = 54.dp,
                end = 22.dp,
                bottom = 28.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                ScreenEyebrow(stringResource(R.string.more_eyebrow))
                Spacer(Modifier.height(8.dp))
                Text(
                    stringResource(R.string.more_title),
                    color = Color.White,
                    style = MaterialTheme.typography.headlineMedium,
                )
                Text(
                    stringResource(R.string.more_subtitle),
                    color = AppTextSecondary,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            when (overviewState) {
                MobileOverviewState.Loading -> item {
                    YallegoCard(modifier = Modifier.fillMaxWidth()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = AppBlueBright,
                                strokeWidth = 2.dp,
                            )
                            Text(
                                stringResource(R.string.more_loading),
                                modifier = Modifier.padding(start = 12.dp),
                                color = AppTextSecondary,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }

                is MobileOverviewState.Error -> item {
                    YallegoCard(modifier = Modifier.fillMaxWidth()) {
                        Text(overviewState.message, color = AppTextSecondary)
                        Spacer(Modifier.height(14.dp))
                        PrimaryActionButton(
                            text = stringResource(R.string.action_retry),
                            onClick = onRefresh,
                            leadingIcon = Icons.Rounded.Refresh,
                        )
                    }
                }

                is MobileOverviewState.Ready -> {
                    item { BusinessCard(overviewState.overview) }
                    item {
                        PlanCard(
                            subscription = overviewState.overview.subscription,
                            onOpenDashboard = onOpenDashboard,
                        )
                    }
                }
            }

            item {
                Text(
                    stringResource(R.string.more_settings_title),
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                )
            }
            item {
                YallegoCard(modifier = Modifier.fillMaxWidth()) {
                    SettingsRow(
                        icon = Icons.Rounded.ManageAccounts,
                        title = stringResource(R.string.more_account),
                        detail = stringResource(R.string.more_account_body),
                        onClick = onOpenAccount,
                    )
                    Spacer(Modifier.height(16.dp))
                    SettingsRow(
                        icon = Icons.Rounded.NotificationsActive,
                        title = stringResource(R.string.more_notifications),
                        detail = if (statusState.notificationAccessGranted) {
                            stringResource(R.string.status_permission_ready)
                        } else {
                            stringResource(R.string.status_permission_missing)
                        },
                        onClick = onOpenNotificationSettings,
                    )
                    Spacer(Modifier.height(16.dp))
                    SettingsRow(
                        icon = Icons.Rounded.BatterySaver,
                        title = stringResource(R.string.more_battery),
                        detail = if (statusState.batteryOptimizationDisabled) {
                            stringResource(R.string.status_battery_ready)
                        } else {
                            stringResource(R.string.status_battery_missing)
                        },
                        onClick = onOpenBatterySettings,
                    )
                    Spacer(Modifier.height(16.dp))
                    SettingsRow(
                        icon = Icons.Rounded.AdminPanelSettings,
                        title = stringResource(R.string.more_app_settings),
                        detail = stringResource(R.string.more_app_settings_body),
                        onClick = onOpenAppSettings,
                    )
                }
            }
        }
    }
}

@Composable
private fun BusinessCard(overview: MobileOverview) {
    YallegoCard(modifier = Modifier.fillMaxWidth(), elevated = true) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(Icons.Rounded.Devices, size = 46)
            Column(Modifier.padding(start = 14.dp).weight(1f)) {
                Text(
                    overview.businessName,
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    overview.deviceLabel,
                    color = AppTextSecondary,
                    style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    overview.deviceId,
                    color = AppTextTertiary,
                    style = MaterialTheme.typography.labelSmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Spacer(Modifier.height(16.dp))
        Text(
            stringResource(R.string.more_wallets_title),
            color = AppTextTertiary,
            style = MaterialTheme.typography.labelSmall,
        )
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (overview.wallets.isEmpty()) {
                Text(
                    stringResource(R.string.more_wallets_empty),
                    color = AppTextSecondary,
                    style = MaterialTheme.typography.bodySmall,
                )
            } else {
                overview.wallets.forEach { wallet ->
                    Surface(
                        color = AppSurfaceElevated,
                        shape = CircleShape,
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Rounded.AccountBalanceWallet,
                                contentDescription = null,
                                tint = AppBlueBright,
                                modifier = Modifier.size(15.dp),
                            )
                            Text(
                                wallet.displayName,
                                modifier = Modifier.padding(start = 6.dp),
                                color = Color.White,
                                style = MaterialTheme.typography.labelMedium,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PlanCard(
    subscription: MobileSubscription?,
    onOpenDashboard: () -> Unit,
) {
    YallegoCard(modifier = Modifier.fillMaxWidth()) {
        Text(
            stringResource(R.string.more_plan_title),
            color = AppTextTertiary,
            style = MaterialTheme.typography.labelSmall,
        )
        Spacer(Modifier.height(7.dp))
        Text(
            subscription?.planName ?: stringResource(R.string.more_plan_unavailable),
            color = Color.White,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
        )
        if (subscription != null) {
            val trial = subscription.trial
            val unlimited = subscription.transactionsLimit < 0
            val progress = if (unlimited || subscription.transactionsLimit == 0) {
                0f
            } else {
                (subscription.transactionsUsed.toFloat() / subscription.transactionsLimit).coerceIn(0f, 1f)
            }
            Spacer(Modifier.height(5.dp))
            Text(
                if (trial?.endsAtIso != null) {
                    stringResource(R.string.more_trial_ends, formatPlanDate(trial.endsAtIso))
                } else {
                    stringResource(R.string.more_plan_renews, formatPlanDate(subscription.periodEndIso))
                },
                color = AppTextSecondary,
                style = MaterialTheme.typography.bodySmall,
            )
            if (trial != null) {
                Spacer(Modifier.height(6.dp))
                Text(
                    if (subscription.accessState == "EXPIRED" || subscription.accessState == "CANCELED") {
                        stringResource(R.string.more_trial_ended)
                    } else {
                        stringResource(R.string.more_trial_active)
                    },
                    color = if (subscription.accessState == "EXPIRED" || subscription.accessState == "CANCELED") AppTextSecondary else AppBlueBright,
                    style = MaterialTheme.typography.labelMedium,
                )
                Text(
                    stringResource(
                        R.string.more_trial_usage,
                        trial.transactionsToday,
                        trial.transactionsTotal,
                    ),
                    color = AppTextSecondary,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Spacer(Modifier.height(18.dp))
            Row {
                Text(
                    stringResource(R.string.more_plan_usage),
                    color = AppTextSecondary,
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    if (unlimited) {
                        stringResource(R.string.more_plan_unlimited, subscription.transactionsUsed)
                    } else {
                        "${subscription.transactionsUsed} / ${subscription.transactionsLimit}"
                    },
                    color = Color.White,
                    style = MaterialTheme.typography.labelMedium,
                )
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(6.dp),
                color = AppBlueBright,
                trackColor = AppSurfaceElevated,
            )
        }
        Spacer(Modifier.height(18.dp))
        PrimaryActionButton(
            text = stringResource(R.string.more_manage_plan),
            onClick = onOpenDashboard,
            leadingIcon = Icons.AutoMirrored.Rounded.Launch,
        )
    }
}

@Composable
private fun SettingsRow(
    icon: ImageVector,
    title: String,
    detail: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = AppBlueBright, modifier = Modifier.size(22.dp))
        Column(Modifier.padding(horizontal = 13.dp).weight(1f)) {
            Text(title, color = Color.White, style = MaterialTheme.typography.titleSmall)
            Text(detail, color = AppTextSecondary, style = MaterialTheme.typography.bodySmall)
        }
        Icon(
            Icons.AutoMirrored.Rounded.ArrowForwardIos,
            contentDescription = null,
            tint = AppTextTertiary,
            modifier = Modifier.size(15.dp),
        )
    }
}

private fun formatPlanDate(value: String): String = runCatching {
    DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date.from(Instant.parse(value)))
}.getOrDefault(value)
