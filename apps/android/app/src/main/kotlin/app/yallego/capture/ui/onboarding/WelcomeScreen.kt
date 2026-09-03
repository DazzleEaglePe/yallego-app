package app.yallego.capture.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.yallego.capture.R
import app.yallego.capture.ui.components.IconBadge
import app.yallego.capture.ui.components.PrimaryActionButton
import app.yallego.capture.ui.components.ScreenEyebrow
import app.yallego.capture.ui.components.SupportNote
import app.yallego.capture.ui.components.YallegoBackdrop
import app.yallego.capture.ui.components.YallegoBrandHeader
import app.yallego.capture.ui.components.YallegoCard
import app.yallego.capture.ui.theme.AppCyan
import app.yallego.capture.ui.theme.AppTextSecondary
import app.yallego.capture.ui.theme.WalletPlin
import app.yallego.capture.ui.theme.WalletYape

@Composable
fun WelcomeScreen(onStart: () -> Unit) {
    YallegoBackdrop {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
        ) {
            YallegoBrandHeader(trailingLabel = stringResource(R.string.mobile_label))
            Spacer(Modifier.height(40.dp))
            ScreenEyebrow(stringResource(R.string.onboarding_eyebrow))
            Spacer(Modifier.height(14.dp))
            Text(
                text = stringResource(R.string.onboarding_welcome_title),
                color = Color.White,
                style = MaterialTheme.typography.displaySmall,
            )
            Spacer(Modifier.height(14.dp))
            Text(
                text = stringResource(R.string.onboarding_welcome_body),
                color = AppTextSecondary,
                style = MaterialTheme.typography.bodyLarge,
            )
            Spacer(Modifier.height(30.dp))
            PaymentPreview()
            Spacer(Modifier.height(30.dp))
            PrimaryActionButton(
                text = stringResource(R.string.onboarding_welcome_cta),
                onClick = onStart,
                leadingIcon = Icons.Rounded.NotificationsActive,
            )
            Spacer(Modifier.height(16.dp))
            SupportNote(
                text = stringResource(R.string.onboarding_private_note),
                icon = Icons.Rounded.Shield,
            )
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun PaymentPreview() {
    YallegoCard(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.preview_live_title),
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                )
                Text(
                    text = stringResource(R.string.preview_live_body),
                    style = MaterialTheme.typography.bodySmall,
                    color = AppTextSecondary,
                )
            }
            Box(Modifier.size(8.dp).background(AppCyan, CircleShape))
        }
        Spacer(Modifier.height(20.dp))
        WalletNotification(
            wallet = "Yape",
            message = stringResource(R.string.preview_yape_payment),
            color = WalletYape,
        )
        Spacer(Modifier.height(10.dp))
        WalletNotification(
            wallet = "Plin",
            message = stringResource(R.string.preview_plin_payment),
            color = WalletPlin,
        )
    }
}

@Composable
private fun WalletNotification(wallet: String, message: String, color: Color) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .background(color, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = wallet.take(1),
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
        Column(Modifier.weight(1f)) {
            Text(wallet, color = Color.White, style = MaterialTheme.typography.labelLarge)
            Text(message, color = AppTextSecondary, style = MaterialTheme.typography.bodySmall)
        }
        Text("•••", color = AppTextSecondary, style = MaterialTheme.typography.bodySmall)
    }
}
