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

data class MobileOverview(
    val businessName: String,
    val deviceId: String,
    val deviceLabel: String,
    val wallets: List<MobileWallet>,
    val subscription: MobileSubscription?,
    val recentActivity: List<MobileTransaction>,
)

data class MobileWallet(val code: String, val displayName: String)

data class MobileSubscription(
    val planCode: String,
    val planName: String,
    val status: String,
    val accessState: String,
    val periodEndIso: String,
    val transactionsUsed: Int,
    val transactionsLimit: Int,
    val trial: MobileTrial? = null,
)

data class MobileTrial(
    val endsAtIso: String?,
    val transactionsToday: Int,
    val transactionsTotal: Int,
    val dailyResetAtIso: String?,
)

data class MobileTransaction(
    val id: String,
    val walletCode: String,
    val walletName: String,
    val senderName: String?,
    val amount: String,
    val currency: String,
    val status: String,
    val occurredAtIso: String,
)

/** Resultado de una llamada a la API interna; evita filtrar excepciones de red hacia la UI. */
sealed interface DeviceCallResult<out T> {
    data class Success<T>(val value: T) : DeviceCallResult<T>
    data class Failure(val message: String, val code: String? = null) : DeviceCallResult<Nothing>
}
