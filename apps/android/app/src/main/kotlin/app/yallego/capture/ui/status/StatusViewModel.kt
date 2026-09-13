package app.yallego.capture.ui.status

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.yallego.capture.data.local.datastore.RemoteConfigPreferences
import app.yallego.capture.data.local.database.NotificationQueueDao
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.domain.model.DeviceCallResult
import app.yallego.capture.domain.model.MobileOverview
import app.yallego.capture.domain.usecase.CheckBatteryOptimizationUseCase
import app.yallego.capture.domain.usecase.CheckNotificationAccessUseCase
import app.yallego.capture.domain.usecase.GetMobileOverviewUseCase
import app.yallego.capture.domain.usecase.RefreshRemoteConfigUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class OperationalStatus { ACTIVE, WARNING, STOPPED }
enum class DeviceConnectionStatus { ONLINE, DELAYED, OFFLINE }

sealed interface MobileOverviewState {
    data object Loading : MobileOverviewState
    data class Ready(val overview: MobileOverview) : MobileOverviewState
    data class Error(val message: String) : MobileOverviewState
}

data class StatusUiState(
    val businessName: String?,
    val notificationAccessGranted: Boolean,
    val batteryOptimizationDisabled: Boolean,
    val lastHeartbeatAtEpochMs: Long?,
    val queueSize: Int,
    val nowEpochMs: Long,
) {
    val operationalStatus: OperationalStatus
        get() = when {
            !notificationAccessGranted -> OperationalStatus.STOPPED
            !batteryOptimizationDisabled -> OperationalStatus.WARNING
            else -> OperationalStatus.ACTIVE
        }

    val connectionStatus: DeviceConnectionStatus
        get() = resolveDeviceConnection(lastHeartbeatAtEpochMs, nowEpochMs)
}

internal fun resolveDeviceConnection(
    lastHeartbeatAtEpochMs: Long?,
    nowEpochMs: Long,
): DeviceConnectionStatus {
    val elapsed = lastHeartbeatAtEpochMs?.let { (nowEpochMs - it).coerceAtLeast(0) }
        ?: return DeviceConnectionStatus.OFFLINE
    return when {
        elapsed < 3 * 60_000L -> DeviceConnectionStatus.ONLINE
        elapsed < 6 * 60_000L -> DeviceConnectionStatus.DELAYED
        else -> DeviceConnectionStatus.OFFLINE
    }
}

@HiltViewModel
class StatusViewModel @Inject constructor(
    credentialsStore: DeviceCredentialsStore,
    remoteConfigPreferences: RemoteConfigPreferences,
    private val checkNotificationAccess: CheckNotificationAccessUseCase,
    private val checkBatteryOptimization: CheckBatteryOptimizationUseCase,
    private val refreshRemoteConfig: RefreshRemoteConfigUseCase,
    private val getMobileOverview: GetMobileOverviewUseCase,
    queueDao: NotificationQueueDao,
) : ViewModel() {

    private val permissionsRefresh = MutableStateFlow(0)
    private val clock = MutableStateFlow(System.currentTimeMillis())
    private val _overviewState = MutableStateFlow<MobileOverviewState>(MobileOverviewState.Loading)
    val overviewState: StateFlow<MobileOverviewState> = _overviewState

    init {
        // Al llegar a la pantalla principal se refresca la configuración sin
        // esperar al primer ciclo de señal de vida (hasta 2 minutos de espera).
        viewModelScope.launch { refreshRemoteConfig() }
        viewModelScope.launch {
            while (true) {
                delay(30_000)
                clock.value = System.currentTimeMillis()
            }
        }
    }

    val uiState: StateFlow<StatusUiState> = combine(
        permissionsRefresh,
        remoteConfigPreferences.lastHeartbeatAtEpochMs,
        queueDao.observePendingCount(),
        clock,
    ) { _, lastHeartbeat, queueSize, now ->
        StatusUiState(
            businessName = credentialsStore.businessName,
            notificationAccessGranted = checkNotificationAccess(),
            batteryOptimizationDisabled = checkBatteryOptimization(),
            lastHeartbeatAtEpochMs = lastHeartbeat,
            queueSize = queueSize,
            nowEpochMs = now,
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
            nowEpochMs = System.currentTimeMillis(),
        ),
    )

    fun refreshPermissions() {
        permissionsRefresh.value += 1
        clock.value = System.currentTimeMillis()
    }

    fun refreshOverview() {
        viewModelScope.launch {
            _overviewState.value = MobileOverviewState.Loading
            _overviewState.value = when (val result = getMobileOverview()) {
                is DeviceCallResult.Success -> MobileOverviewState.Ready(result.value)
                is DeviceCallResult.Failure -> MobileOverviewState.Error(result.message)
            }
        }
    }
}
