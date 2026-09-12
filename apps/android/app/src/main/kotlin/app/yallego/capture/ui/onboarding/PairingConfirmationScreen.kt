package app.yallego.capture.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.yallego.capture.R
import app.yallego.capture.ui.components.PrimaryActionButton
import app.yallego.capture.ui.components.ProgressDots
import app.yallego.capture.ui.components.ScreenEyebrow
import app.yallego.capture.ui.components.SupportNote
import app.yallego.capture.ui.components.YallegoBackdrop
import app.yallego.capture.ui.components.YallegoBrandHeader
import app.yallego.capture.ui.components.YallegoCard
import app.yallego.capture.ui.theme.AppBlue
import app.yallego.capture.ui.theme.AppCyan
import app.yallego.capture.ui.theme.AppTextSecondary

@Composable
fun PairingConfirmationScreen(businessName: String, onContinue: () -> Unit) {
    YallegoBackdrop {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
        ) {
            YallegoBrandHeader(trailingLabel = stringResource(R.string.step_one_of_four))
            Spacer(Modifier.height(34.dp))
            ProgressDots(current = 0, total = 4)
            Spacer(Modifier.weight(1f))

            Box(
                modifier = Modifier
                    .size(72.dp)
                    .background(AppBlue.copy(alpha = 0.14f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier.size(48.dp).background(AppBlue, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(25.dp))
                }
            }
            Spacer(Modifier.height(28.dp))
            ScreenEyebrow(stringResource(R.string.pairing_confirmation_eyebrow))
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.pairing_confirmation_title),
                color = Color.White,
                style = MaterialTheme.typography.headlineLarge,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = stringResource(R.string.pairing_confirmation_body, businessName.ifBlank { stringResource(R.string.business_fallback) }),
                color = AppTextSecondary,
                style = MaterialTheme.typography.bodyLarge,
            )
            Spacer(Modifier.height(24.dp))

            YallegoCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = stringResource(R.string.pairing_confirmation_business_label),
                    color = AppCyan,
                    style = MaterialTheme.typography.labelSmall,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = businessName.ifBlank { stringResource(R.string.business_fallback) },
                    color = Color.White,
                    style = MaterialTheme.typography.titleLarge,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = stringResource(R.string.pairing_confirmation_business_hint),
                    color = AppTextSecondary,
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            Spacer(Modifier.weight(1f))
            PrimaryActionButton(
                text = stringResource(R.string.pairing_confirmation_cta),
                onClick = onContinue,
                leadingIcon = Icons.Rounded.Link,
            )
            Spacer(Modifier.height(14.dp))
            SupportNote(
                text = stringResource(R.string.pairing_confirmation_private_note),
                icon = Icons.Rounded.Lock,
            )
            Spacer(Modifier.height(8.dp))
        }
    }
}
