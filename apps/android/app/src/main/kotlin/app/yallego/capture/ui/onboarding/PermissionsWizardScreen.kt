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
import androidx.compose.material.icons.rounded.BatterySaver
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
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
import app.yallego.capture.ui.theme.AppBlueBright
import app.yallego.capture.ui.theme.AppCyan
import app.yallego.capture.ui.theme.AppSurfaceElevated
import app.yallego.capture.ui.theme.AppTextSecondary
import app.yallego.capture.ui.theme.AppTextTertiary
import app.yallego.capture.ui.theme.SuccessBright
import app.yallego.capture.util.Vendor
import app.yallego.capture.util.VendorHints

@Composable
fun NotificationAccessStep(granted: Boolean, onOpenSettings: () -> Unit, onContinue: () -> Unit) {
    PermissionStep(
        eyebrow = stringResource(R.string.permission_notifications_eyebrow),
        stepLabel = stringResource(R.string.step_two_of_four),
        progressIndex = 1,
        icon = Icons.Rounded.NotificationsActive,
        title = stringResource(R.string.permission_notifications_title),
        body = stringResource(R.string.permission_notifications_body),
        detail = stringResource(R.string.permission_notifications_detail),
        granted = granted,
        grantedLabel = stringResource(R.string.permission_notifications_granted),
        ctaLabel = stringResource(R.string.permission_notifications_cta),
        onOpenSettings = onOpenSettings,
        onContinue = onContinue,
    )
}

@Composable
fun BatteryOptimizationStep(granted: Boolean, onOpenSettings: () -> Unit, onContinue: () -> Unit) {
    PermissionStep(
        eyebrow = stringResource(R.string.permission_battery_eyebrow),
        stepLabel = stringResource(R.string.step_three_of_four),
        progressIndex = 2,
        icon = Icons.Rounded.BatterySaver,
        title = stringResource(R.string.permission_battery_title),
        body = stringResource(R.string.permission_battery_body),
        detail = stringResource(R.string.permission_battery_detail),
        granted = granted,
        grantedLabel = stringResource(R.string.permission_battery_granted),
        ctaLabel = stringResource(R.string.permission_battery_cta),
        onOpenSettings = onOpenSettings,
        onContinue = onContinue,
    )
}

@Composable
private fun PermissionStep(
    eyebrow: String,
    stepLabel: String,
    progressIndex: Int,
    icon: ImageVector,
    title: String,
    body: String,
    detail: String,
    granted: Boolean,
    grantedLabel: String,
    ctaLabel: String,
    onOpenSettings: () -> Unit,
    onContinue: () -> Unit,
) {
    YallegoBackdrop {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
        ) {
            YallegoBrandHeader(trailingLabel = stepLabel)
            Spacer(Modifier.height(34.dp))
            ProgressDots(current = progressIndex, total = 4)
            Spacer(Modifier.height(34.dp))
            IconBadge(icon = icon, tint = AppCyan, size = 64)
            Spacer(Modifier.height(24.dp))
            ScreenEyebrow(eyebrow)
            Spacer(Modifier.height(12.dp))
            Text(title, style = MaterialTheme.typography.headlineLarge, color = Color.White)
            Spacer(Modifier.height(10.dp))
            Text(body, style = MaterialTheme.typography.bodyLarge, color = AppTextSecondary)
            Spacer(Modifier.height(24.dp))

            YallegoCard(modifier = Modifier.fillMaxWidth(), elevated = true) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Rounded.Lock,
                        contentDescription = null,
                        tint = AppBlueBright,
                        modifier = Modifier.size(20.dp),
                    )
                    Text(
                        text = stringResource(R.string.permission_privacy_title),
                        modifier = Modifier.padding(start = 10.dp),
                        color = Color.White,
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                Spacer(Modifier.height(10.dp))
                Text(detail, color = AppTextSecondary, style = MaterialTheme.typography.bodyMedium)
            }

            Spacer(Modifier.height(22.dp))
            if (granted) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SuccessBright.copy(alpha = 0.1f), MaterialTheme.shapes.medium)
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier.size(30.dp).background(SuccessBright, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Check,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                    Column(Modifier.padding(start = 12.dp)) {
                        Text(
                            text = stringResource(R.string.permission_ready_label),
                            color = SuccessBright,
                            style = MaterialTheme.typography.labelSmall,
                        )
                        Text(grantedLabel, color = Color.White, style = MaterialTheme.typography.labelLarge)
                    }
                }
                Spacer(Modifier.height(16.dp))
                PrimaryActionButton(
                    text = stringResource(R.string.permission_continue),
                    onClick = onContinue,
                    leadingIcon = Icons.Rounded.Check,
                )
            } else {
                PrimaryActionButton(
                    text = ctaLabel,
                    onClick = onOpenSettings,
                    leadingIcon = Icons.Rounded.Settings,
                )
            }
            Spacer(Modifier.height(16.dp))
            SupportNote(
                text = stringResource(R.string.permission_settings_note),
                icon = Icons.Rounded.Tune,
            )
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
fun VendorGuidanceStep(vendor: Vendor, onSkip: () -> Unit, onContinue: () -> Unit) {
    val guidance = VendorHints.guidanceFor(vendor)
    if (guidance == null) {
        // Efecto, no una llamada directa: evita reinvocar la navegación en cada recomposición.
        LaunchedEffect(Unit) { onContinue() }
        return
    }

    val vendorName = vendor.name.lowercase().replaceFirstChar { it.uppercase() }
    YallegoBackdrop {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
        ) {
            YallegoBrandHeader(trailingLabel = stringResource(R.string.extra_adjustment_label))
            Spacer(Modifier.height(34.dp))
            IconBadge(Icons.Rounded.Tune, tint = AppCyan, size = 64)
            Spacer(Modifier.height(24.dp))
            ScreenEyebrow(stringResource(R.string.permission_vendor_eyebrow))
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.permission_vendor_title, vendorName),
                color = Color.White,
                style = MaterialTheme.typography.headlineLarge,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = stringResource(R.string.permission_vendor_body, vendorName),
                color = AppTextSecondary,
                style = MaterialTheme.typography.bodyLarge,
            )
            Spacer(Modifier.height(24.dp))

            YallegoCard(modifier = Modifier.fillMaxWidth()) {
                guidance.instructions.forEachIndexed { index, instruction ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(30.dp).background(AppSurfaceElevated, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = (index + 1).toString().padStart(2, '0'),
                                color = AppBlueBright,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        Text(
                            text = instruction,
                            modifier = Modifier.padding(start = 12.dp).weight(1f),
                            color = Color.White,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    if (index < guidance.instructions.lastIndex) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .padding(vertical = 14.dp)
                                .height(1.dp)
                                .background(AppSurfaceElevated),
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))
            PrimaryActionButton(
                text = stringResource(R.string.permission_vendor_continue),
                onClick = onContinue,
                leadingIcon = Icons.Rounded.Check,
            )
            TextButton(onClick = onSkip, modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = stringResource(R.string.permission_vendor_skip),
                    color = AppTextTertiary,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
    }
}
