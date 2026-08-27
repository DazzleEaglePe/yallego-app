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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Keyboard
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import app.yallego.capture.R
import app.yallego.capture.ui.components.IconBadge
import app.yallego.capture.ui.components.PrimaryActionButton
import app.yallego.capture.ui.components.ProgressDots
import app.yallego.capture.ui.components.ScreenEyebrow
import app.yallego.capture.ui.components.SecondaryActionButton
import app.yallego.capture.ui.components.YallegoBackdrop
import app.yallego.capture.ui.components.YallegoBrandHeader
import app.yallego.capture.ui.components.YallegoCard
import app.yallego.capture.ui.theme.AppBlueBright
import app.yallego.capture.ui.theme.AppBorder
import app.yallego.capture.ui.theme.AppCyan
import app.yallego.capture.ui.theme.AppSurface
import app.yallego.capture.ui.theme.AppTextSecondary
import app.yallego.capture.ui.theme.AppTextTertiary
import app.yallego.capture.ui.theme.DangerBright

@Composable
fun PairingScreen(
    isPairing: Boolean,
    errorMessage: String?,
    prefillCode: String?,
    onScanQr: () -> Unit,
    onSubmit: (String) -> Unit,
) {
    var code by remember(prefillCode) { mutableStateOf(prefillCode.orEmpty()) }

    YallegoBackdrop {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
        ) {
            YallegoBrandHeader(trailingLabel = stringResource(R.string.step_one_of_four))
            Spacer(Modifier.height(34.dp))
            ProgressDots(current = 0, total = 4)
            Spacer(Modifier.height(26.dp))
            ScreenEyebrow(stringResource(R.string.pairing_eyebrow))
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.pairing_title),
                style = MaterialTheme.typography.headlineLarge,
                color = Color.White,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = stringResource(R.string.pairing_body),
                style = MaterialTheme.typography.bodyLarge,
                color = AppTextSecondary,
            )
            Spacer(Modifier.height(26.dp))

            YallegoCard(modifier = Modifier.fillMaxWidth(), elevated = true) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconBadge(Icons.Rounded.QrCodeScanner, tint = AppCyan)
                    Column(Modifier.padding(start = 14.dp)) {
                        Text(
                            text = stringResource(R.string.pairing_scan_title),
                            color = Color.White,
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            text = stringResource(R.string.pairing_scan_hint),
                            color = AppTextSecondary,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
                Spacer(Modifier.height(18.dp))
                SecondaryActionButton(
                    text = stringResource(R.string.pairing_scan_cta),
                    onClick = onScanQr,
                    icon = Icons.Rounded.QrCodeScanner,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 22.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.height(1.dp).weight(1f).background(AppBorder))
                Text(
                    text = stringResource(R.string.pairing_or_manual),
                    modifier = Modifier.padding(horizontal = 12.dp),
                    color = AppTextTertiary,
                    style = MaterialTheme.typography.labelSmall,
                )
                Box(Modifier.height(1.dp).weight(1f).background(AppBorder))
            }

            OutlinedTextField(
                value = code,
                onValueChange = { value ->
                    code = value.uppercase()
                        .filter { it.isLetterOrDigit() || it == '-' }
                        .take(16)
                },
                label = { Text(stringResource(R.string.pairing_manual_label)) },
                placeholder = { Text(stringResource(R.string.pairing_manual_placeholder)) },
                leadingIcon = { Icon(Icons.Rounded.Keyboard, contentDescription = null) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                modifier = Modifier.fillMaxWidth(),
                textStyle = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                shape = MaterialTheme.shapes.medium,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedContainerColor = AppSurface,
                    unfocusedContainerColor = AppSurface,
                    focusedBorderColor = AppBlueBright,
                    unfocusedBorderColor = AppBorder,
                    focusedLabelColor = AppBlueBright,
                    unfocusedLabelColor = AppTextTertiary,
                    focusedLeadingIconColor = AppBlueBright,
                    unfocusedLeadingIconColor = AppTextTertiary,
                    focusedPlaceholderColor = AppTextTertiary,
                    unfocusedPlaceholderColor = AppTextTertiary,
                    cursorColor = AppCyan,
                ),
            )

            if (errorMessage != null) {
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DangerBright.copy(alpha = 0.1f), MaterialTheme.shapes.small)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Rounded.ErrorOutline,
                        contentDescription = null,
                        tint = DangerBright,
                        modifier = Modifier.size(18.dp),
                    )
                    Text(
                        text = errorMessage,
                        modifier = Modifier.padding(start = 9.dp),
                        color = DangerBright,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            Spacer(Modifier.height(18.dp))
            PrimaryActionButton(
                text = if (isPairing) {
                    stringResource(R.string.pairing_loading)
                } else {
                    stringResource(R.string.pairing_submit_cta)
                },
                onClick = { onSubmit(code) },
                enabled = code.isNotBlank(),
                loading = isPairing,
                leadingIcon = if (isPairing) null else Icons.Rounded.Keyboard,
            )
            Spacer(Modifier.height(12.dp))
        }
    }
}
