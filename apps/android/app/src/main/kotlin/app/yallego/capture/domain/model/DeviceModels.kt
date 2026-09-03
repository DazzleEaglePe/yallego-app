package app.yallego.capture.domain.model

data class DeviceMetadata(
    val manufacturer: String?,
    val model: String?,
    val osVersion: String?,
    val appVersion: String?,
)

data class PairingResult(
    val deviceId: String,
    val deviceToken: String,
    val businessName: String,
    val monitoredPackages: List<String>,
)

data class RemoteConfig(
    val monitoredPackages: List<String>,
    val configVersion: Int,
    val ingestBatchSize: Int? = null,
)

data class HeartbeatOutcome(
    val serverTimeIso: String,
    val remoteConfig: RemoteConfig,
)

data class PermissionSnapshot(
    val notificationAccessGranted: Boolean,
    val batteryOptimizationDisabled: Boolean,
)

/** Resultado de una llamada a la API interna; evita filtrar excepciones de red hacia la UI. */
sealed interface DeviceCallResult<out T> {
    data class Success<T>(val value: T) : DeviceCallResult<T>
    data class Failure(val message: String, val code: String? = null) : DeviceCallResult<Nothing>
}
