package app.yallego.capture

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.domain.usecase.CheckBatteryOptimizationUseCase
import app.yallego.capture.domain.usecase.CheckNotificationAccessUseCase
import app.yallego.capture.service.CaptureForegroundService
import app.yallego.capture.ui.Routes
import app.yallego.capture.ui.YallegoNavHost
import app.yallego.capture.ui.theme.YallegoTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var credentialsStore: DeviceCredentialsStore
    @Inject lateinit var checkNotificationAccess: CheckNotificationAccessUseCase
    @Inject lateinit var checkBatteryOptimization: CheckBatteryOptimizationUseCase

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* no-op */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestPostNotificationsPermissionIfNeeded()

        // Idempotente: si ya estaba en primer plano, `onStartCommand` simplemente
        // vuelve a disparar la señal de vida sin efecto adicional.
        if (credentialsStore.isPaired) {
            CaptureForegroundService.start(this)
        }

        val deepLinkCode = intent?.data?.let(::extractPairingCode)

        setContent {
            YallegoTheme {
                YallegoNavHost(
                    credentialsStore = credentialsStore,
                    deepLinkCode = deepLinkCode,
                    startDestination = resolveStartDestination(),
                )
            }
        }
    }

    /** Evita repetir la lista de verificación en cada apertura si ya está todo listo. */
    private fun resolveStartDestination(): String = when {
        !credentialsStore.isPaired -> Routes.WELCOME
        !checkNotificationAccess() || !checkBatteryOptimization() -> Routes.CHECKLIST
        else -> Routes.STATUS
    }

    private fun requestPostNotificationsPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        if (!granted) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun extractPairingCode(uri: Uri): String? =
        if (uri.scheme == "yallego" && uri.host == "pair") uri.getQueryParameter("code") else null
}
