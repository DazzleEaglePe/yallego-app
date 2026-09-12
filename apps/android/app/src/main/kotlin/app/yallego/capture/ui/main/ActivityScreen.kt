package app.yallego.capture.ui.main

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CloudQueue
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.yallego.capture.R
import app.yallego.capture.domain.model.MobileTransaction
import app.yallego.capture.ui.components.IconBadge
import app.yallego.capture.ui.components.PrimaryActionButton
import app.yallego.capture.ui.components.ScreenEyebrow
import app.yallego.capture.ui.components.YallegoBackdrop
import app.yallego.capture.ui.components.YallegoCard
import app.yallego.capture.ui.status.MobileOverviewState
import app.yallego.capture.ui.theme.AppBlueBright
import app.yallego.capture.ui.theme.AppSurfaceElevated
import app.yallego.capture.ui.theme.AppTextSecondary
import app.yallego.capture.ui.theme.AppTextTertiary
import app.yallego.capture.ui.theme.DangerBright
import app.yallego.capture.ui.theme.SuccessBright
import app.yallego.capture.ui.theme.WarningBright
import java.text.DateFormat
import java.time.Instant
import java.util.Date

@Composable
fun ActivityScreen(
    overviewState: MobileOverviewState,
    queueSize: Int,
    onRefresh: () -> Unit,
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        ScreenEyebrow(stringResource(R.string.activity_eyebrow))
                        Spacer(Modifier.height(8.dp))
                        Text(
                            stringResource(R.string.activity_title),
                            color = Color.White,
                            style = MaterialTheme.typography.headlineMedium,
                        )
                        Text(
                            stringResource(R.string.activity_subtitle),
                            color = AppTextSecondary,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    IconButton(onClick = onRefresh) {
                        Icon(
                            Icons.Rounded.Refresh,
                            contentDescription = stringResource(R.string.action_refresh),
                            tint = AppBlueBright,
                        )
                    }
                }
            }

            item {
                AnimatedVisibility(visible = queueSize > 0) {
                    YallegoCard(modifier = Modifier.fillMaxWidth(), elevated = true) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconBadge(Icons.Rounded.CloudQueue, size = 42)
                            Column(Modifier.padding(start = 13.dp).weight(1f)) {
                                Text(
                                    stringResource(R.string.activity_pending_title),
                                    color = Color.White,
                                    style = MaterialTheme.typography.titleSmall,
                                )
                                Text(
                                    stringResource(R.string.activity_pending_body, queueSize),
                                    color = AppTextSecondary,
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                }
            }

            when (overviewState) {
                MobileOverviewState.Loading -> item {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 72.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = AppBlueBright, strokeWidth = 2.dp)
                    }
                }

                is MobileOverviewState.Error -> item {
                    YallegoCard(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            stringResource(R.string.activity_error_title),
                            color = Color.White,
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Spacer(Modifier.height(5.dp))
                        Text(
                            overviewState.message,
                            color = AppTextSecondary,
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Spacer(Modifier.height(16.dp))
                        PrimaryActionButton(
                            text = stringResource(R.string.action_retry),
                            onClick = onRefresh,
                            leadingIcon = Icons.Rounded.Refresh,
                        )
                    }
                }

                is MobileOverviewState.Ready -> {
                    if (overviewState.overview.recentActivity.isEmpty()) {
                        item { ActivityEmptyState() }
                    } else {
                        items(
                            items = overviewState.overview.recentActivity,
                            key = { it.id },
                        ) { transaction ->
                            TransactionCard(transaction)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActivityEmptyState() {
    YallegoCard(modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier.fillMaxWidth().padding(vertical = 34.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                IconBadge(Icons.Rounded.Payments)
                Spacer(Modifier.height(16.dp))
                Text(
                    stringResource(R.string.activity_empty_title),
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    stringResource(R.string.activity_empty_body),
                    color = AppTextSecondary,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun TransactionCard(transaction: MobileTransaction) {
    val statusColor = when (transaction.status) {
        "CONFIRMED" -> SuccessBright
        "DISPUTED", "VOIDED" -> DangerBright
        else -> WarningBright
    }
    val statusLabel = when (transaction.status) {
        "CONFIRMED" -> stringResource(R.string.transaction_status_confirmed)
        "DISPUTED" -> stringResource(R.string.transaction_status_disputed)
        "VOIDED" -> stringResource(R.string.transaction_status_voided)
        else -> stringResource(R.string.transaction_status_captured)
    }
    val amount = if (transaction.currency == "PEN") "S/ ${transaction.amount}" else {
        "${transaction.currency} ${transaction.amount}"
    }

    YallegoCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .background(AppSurfaceElevated, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Rounded.Payments,
                    contentDescription = null,
                    tint = AppBlueBright,
                    modifier = Modifier.size(20.dp),
                )
            }
            Column(Modifier.padding(start = 13.dp).weight(1f)) {
                Text(
                    transaction.senderName ?: stringResource(R.string.transaction_sender_unknown),
                    color = Color.White,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "${transaction.walletName} · ${formatActivityTime(transaction.occurredAtIso)}",
                    color = AppTextTertiary,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    amount,
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(5.dp))
                Surface(
                    color = statusColor.copy(alpha = 0.13f),
                    shape = CircleShape,
                ) {
                    Text(
                        statusLabel,
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                        color = statusColor,
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }
        }
    }
}

private fun formatActivityTime(value: String): String = runCatching {
    DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT)
        .format(Date.from(Instant.parse(value)))
}.getOrDefault(value)
