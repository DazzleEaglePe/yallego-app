package app.yallego.capture.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.domain.model.DeviceCallResult
import app.yallego.capture.domain.usecase.CheckBatteryOptimizationUseCase
import app.yallego.capture.domain.usecase.CheckNotificationAccessUseCase
import app.yallego.capture.domain.usecase.PairDeviceUseCase
import app.yallego.capture.util.Vendor
import app.yallego.capture.util.VendorHints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OnboardingUiState(
    val isPairing: Boolean = false,
    val pairingError: String? = null,
    val businessName: String? = null,
    val notificationAccessGranted: Boolean = false,
    val batteryOptimizationDisabled: Boolean = false,
    val vendor: Vendor = VendorHints.detect(),
)

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val pairDevice: PairDeviceUseCase,
    private val checkNotificationAccess: CheckNotificationAccessUseCase,
    private val checkBatteryOptimization: CheckBatteryOptimizationUseCase,
    private val credentialsStore: DeviceCredentialsStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        OnboardingUiState(businessName = credentialsStore.businessName),
    )
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    fun pair(code: String, onPaired: () -> Unit) {
        if (code.isBlank()) return
        _uiState.update { it.copy(isPairing = true, pairingError = null) }

        viewModelScope.launch {
            when (val result = pairDevice(code)) {
                is DeviceCallResult.Success -> {
                    _uiState.update {
                        it.copy(isPairing = false, businessName = result.value.businessName)
                    }
                    onPaired()
                }
                is DeviceCallResult.Failure -> {
                    _uiState.update { it.copy(isPairing = false, pairingError = result.message) }
                }
            }
        }
    }

    /** Se llama al volver del sistema (Ajustes), donde el usuario concedió o no el permiso. */
    fun refreshPermissionStatus() {
        _uiState.update {
            it.copy(
                notificationAccessGranted = checkNotificationAccess(),
                batteryOptimizationDisabled = checkBatteryOptimization(),
            )
        }
    }
}
