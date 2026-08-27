package app.yallego.capture.ui.status

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.yallego.capture.data.local.datastore.RemoteConfigPreferences
import app.yallego.capture.data.local.database.NotificationQueueDao
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.domain.usecase.CheckBatteryOptimizationUseCase
import app.yallego.capture.domain.usecase.CheckNotificationAccessUseCase
import app.yallego.capture.domain.usecase.RefreshRemoteConfigUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class OperationalStatus { ACTIVE, WARNING, STOPPED }

data class StatusUiState(
    val businessName: String?,
    val notificationAccessGranted: Boolean,
    val batteryOptimizationDisabled: Boolean,
    val lastHeartbeatAtEpochMs: Long?,
    val queueSize: Int,
) {
    val operationalStatus: OperationalStatus
        get() = when {
            !notificationAccessGranted -> OperationalStatus.STOPPED
            !batteryOptimizationDisabled -> OperationalStatus.WARNING
            else -> OperationalStatus.ACTIVE
        }
}

@HiltViewModel
class StatusViewModel @Inject constructor(
    credentialsStore: DeviceCredentialsStore,
    remoteConfigPreferences: RemoteConfigPreferences,
    private val checkNotificationAccess: CheckNotificationAccessUseCase,
    private val checkBatteryOptimization: CheckBatteryOptimizationUseCase,
    private val refreshRemoteConfig: RefreshRemoteConfigUseCase,
    queueDao: NotificationQueueDao,
) : ViewModel() {

    private val permissionsRefresh = MutableStateFlow(0)

    init {
        // Al llegar a la pantalla principal se refresca la configuración sin
        // esperar al primer ciclo de señal de vida (hasta 5 minutos de espera).
        viewModelScope.launch { refreshRemoteConfig() }
    }

    val uiState: StateFlow<StatusUiState> = combine(
        permissionsRefresh,
        remoteConfigPreferences.lastHeartbeatAtEpochMs,
        queueDao.observePendingCount(),
    ) { _, lastHeartbeat, queueSize ->
        StatusUiState(
            businessName = credentialsStore.businessName,
            notificationAccessGranted = checkNotificationAccess(),
            batteryOptimizationDisabled = checkBatteryOptimization(),
            lastHeartbeatAtEpochMs = lastHeartbeat,
            queueSize = queueSize,
        )
    }.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        StatusUiState(
            businessName = credentialsStore.businessName,
            notificationAccessGranted = false,
            batteryOptimizationDisabled = false,
            lastHeartbeatAtEpochMs = null,
            queueSize = 0,
        ),
    )

    fun refreshPermissions() {
        permissionsRefresh.value += 1
    }
}
