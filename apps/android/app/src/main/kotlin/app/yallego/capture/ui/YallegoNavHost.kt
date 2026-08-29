package app.yallego.capture.ui

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.service.CaptureForegroundService
import app.yallego.capture.ui.onboarding.BatteryOptimizationStep
import app.yallego.capture.ui.onboarding.ChecklistScreen
import app.yallego.capture.ui.onboarding.NotificationAccessStep
import app.yallego.capture.ui.onboarding.OnboardingViewModel
import app.yallego.capture.ui.onboarding.PairingConfirmationScreen
import app.yallego.capture.ui.onboarding.PairingScreen
import app.yallego.capture.ui.onboarding.QrScanScreen
import app.yallego.capture.ui.onboarding.VendorGuidanceStep
import app.yallego.capture.ui.onboarding.WelcomeScreen
import app.yallego.capture.ui.status.StatusScreen
import app.yallego.capture.ui.status.StatusViewModel

object Routes {
    const val WELCOME = "welcome"
    const val PAIRING = "pairing"
    const val QR_SCAN = "qr_scan"
    const val CONFIRMATION = "confirmation"
    const val NOTIFICATIONS_PERMISSION = "permissions/notifications"
    const val BATTERY_PERMISSION = "permissions/battery"
    const val VENDOR_GUIDANCE = "permissions/vendor"
    const val CHECKLIST = "checklist"
    const val STATUS = "status"
}

@Composable
fun YallegoNavHost(
    credentialsStore: DeviceCredentialsStore,
    deepLinkCode: String?,
    startDestination: String,
) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.WELCOME) {
            WelcomeScreen(onStart = { navController.navigate(Routes.PAIRING) })
        }

        composable(Routes.PAIRING) {
            val viewModel: OnboardingViewModel = hiltViewModel()
            val state by viewModel.uiState.collectAsState()
            PairingScreen(
                isPairing = state.isPairing,
                errorMessage = state.pairingError,
                prefillCode = deepLinkCode,
                onScanQr = { navController.navigate(Routes.QR_SCAN) },
                onSubmit = { code ->
                    viewModel.pair(code) { navController.navigate(Routes.CONFIRMATION) }
                },
            )
        }

        composable(Routes.QR_SCAN) {
            val viewModel: OnboardingViewModel = hiltViewModel()
            QrScanScreen(
                onCodeScanned = { rawValue ->
                    viewModel.pair(rawValue) { navController.navigate(Routes.CONFIRMATION) }
                },
            )
        }

        composable(Routes.CONFIRMATION) {
            val viewModel: OnboardingViewModel = hiltViewModel()
            val state by viewModel.uiState.collectAsState()
            PairingConfirmationScreen(
                businessName = state.businessName ?: "",
                onContinue = { navController.navigate(Routes.NOTIFICATIONS_PERMISSION) },
            )
        }

        composable(Routes.NOTIFICATIONS_PERMISSION) {
            val viewModel: OnboardingViewModel = hiltViewModel()
            val context = LocalContext.current
            val state by viewModel.uiState.collectAsState()
            RefreshOnResume { viewModel.refreshPermissionStatus() }
            NotificationAccessStep(
                granted = state.notificationAccessGranted,
                onOpenSettings = {
                    context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                },
                onContinue = { navController.navigate(Routes.BATTERY_PERMISSION) },
            )
        }

        composable(Routes.BATTERY_PERMISSION) {
            val viewModel: OnboardingViewModel = hiltViewModel()
            val context = LocalContext.current
            val state by viewModel.uiState.collectAsState()
            RefreshOnResume { viewModel.refreshPermissionStatus() }
            BatteryOptimizationStep(
                granted = state.batteryOptimizationDisabled,
                onOpenSettings = {
                    val intent = Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:${context.packageName}"),
                    )
                    context.startActivity(intent)
                },
                onContinue = { navController.navigate(Routes.VENDOR_GUIDANCE) },
            )
        }

        composable(Routes.VENDOR_GUIDANCE) {
            val viewModel: OnboardingViewModel = hiltViewModel()
            val state by viewModel.uiState.collectAsState()
            val goToChecklist = { navController.navigate(Routes.CHECKLIST) { popUpTo(Routes.WELCOME) { inclusive = true } } }
            VendorGuidanceStep(vendor = state.vendor, onSkip = goToChecklist, onContinue = goToChecklist)
        }

        composable(Routes.CHECKLIST) {
            val viewModel: OnboardingViewModel = hiltViewModel()
            val context = LocalContext.current
            val state by viewModel.uiState.collectAsState()
            RefreshOnResume { viewModel.refreshPermissionStatus() }
            ChecklistScreen(
                pairingDone = credentialsStore.isPaired,
                notificationsGranted = state.notificationAccessGranted,
                batteryGranted = state.batteryOptimizationDisabled,
                onFinish = {
                    CaptureForegroundService.start(context)
                    navController.navigate(Routes.STATUS) { popUpTo(0) { inclusive = true } }
                },
            )
        }

        composable(Routes.STATUS) {
            val viewModel: StatusViewModel = hiltViewModel()
            val state by viewModel.uiState.collectAsState()
            RefreshOnResume { viewModel.refreshPermissions() }
            StatusScreen(state = state)
        }
    }
}

/** Vuelve a leer el estado del sistema cada vez que la pantalla regresa a primer plano tras Ajustes. */
@Composable
private fun RefreshOnResume(onResume: () -> Unit) {
    val lifecycleOwner = LocalLifecycleOwner.current
    LaunchedEffect(lifecycleOwner) {
        onResume()
    }
    val observer = LifecycleEventObserver { _, event ->
        if (event == Lifecycle.Event.ON_RESUME) onResume()
    }
    DisposableEffect(lifecycleOwner) {
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
}
