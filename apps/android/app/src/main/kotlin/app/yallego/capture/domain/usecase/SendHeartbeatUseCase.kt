package app.yallego.capture.domain.usecase

import app.yallego.capture.BuildConfig
import app.yallego.capture.data.local.datastore.RemoteConfigPreferences
import app.yallego.capture.data.local.database.NotificationQueueDao
import app.yallego.capture.domain.model.DeviceCallResult
import app.yallego.capture.domain.model.HeartbeatOutcome
import app.yallego.capture.domain.model.PermissionSnapshot
import app.yallego.capture.domain.repository.DeviceRepository
import javax.inject.Inject

/**
 * Envía la señal de vida (RF-DEV-006) reportando el estado real de los
 * permisos y sincroniza la configuración remota si cambió de versión.
 */
class SendHeartbeatUseCase @Inject constructor(
    private val repository: DeviceRepository,
    private val remoteConfigPreferences: RemoteConfigPreferences,
    private val checkNotificationAccess: CheckNotificationAccessUseCase,
    private val checkBatteryOptimization: CheckBatteryOptimizationUseCase,
    private val queueDao: NotificationQueueDao,
) {
    /**
     * Evita que el worker de respaldo y el servicio activo envíen el mismo
     * heartbeat en paralelo. La ventana es deliberadamente corta: no sustituye
     * la cadencia operativa de dos minutos ni retrasa un reintento posterior.
     */
    suspend fun tryAcquireSlot(): Boolean =
        remoteConfigPreferences.tryAcquireHeartbeatSlot(
            nowEpochMs = System.currentTimeMillis(),
            minimumIntervalMs = HEARTBEAT_DEDUPLICATION_WINDOW_MS,
        )

    suspend operator fun invoke(): DeviceCallResult<HeartbeatOutcome> {
        val permissions = PermissionSnapshot(
            notificationAccessGranted = checkNotificationAccess(),
            batteryOptimizationDisabled = checkBatteryOptimization(),
        )

        val result = repository.sendHeartbeat(
            appVersion = BuildConfig.VERSION_NAME,
            queueSize = queueDao.countPending(),
            permissions = permissions,
        )

        if (result is DeviceCallResult.Success) {
            val config = result.value.remoteConfig
            remoteConfigPreferences.save(config.monitoredPackages, config.configVersion)
            remoteConfigPreferences.recordHeartbeat(System.currentTimeMillis())
        }

        return result
    }

    private companion object {
        const val HEARTBEAT_DEDUPLICATION_WINDOW_MS = 30_000L
    }
}
