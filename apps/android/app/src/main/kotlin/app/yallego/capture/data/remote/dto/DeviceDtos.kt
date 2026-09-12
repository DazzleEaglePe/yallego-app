package app.yallego.capture.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Espejo Kotlin del contrato interno (docs/06_API_CONTRACT.md §13). */

@Serializable
data class DeviceMetadataDto(
    val manufacturer: String? = null,
    val model: String? = null,
    @SerialName("os_version") val osVersion: String? = null,
    @SerialName("app_version") val appVersion: String? = null,
)

@Serializable
data class PairDeviceRequestDto(
    val code: String,
    val device: DeviceMetadataDto,
    val identity: PairingIdentityDto,
)

@Serializable
data class PairingIdentityDto(
    @SerialName("installation_id") val installationId: String,
    @SerialName("android_id") val androidId: String,
    @SerialName("public_key") val publicKey: String,
    @SerialName("request_signature") val requestSignature: String,
)

@Serializable
data class PairDeviceTenantDto(
    val id: String,
    @SerialName("business_name") val businessName: String,
)

@Serializable
data class PairDeviceResponseDto(
    @SerialName("device_id") val deviceId: String,
    @SerialName("device_token") val deviceToken: String,
    val tenant: PairDeviceTenantDto,
    @SerialName("monitored_packages") val monitoredPackages: List<String>,
)

@Serializable
data class HeartbeatPermissionsDto(
    @SerialName("notification_access") val notificationAccess: Boolean,
    @SerialName("battery_optimization_disabled") val batteryOptimizationDisabled: Boolean,
)

@Serializable
data class HeartbeatRequestDto(
    @SerialName("app_version") val appVersion: String? = null,
    @SerialName("queue_size") val queueSize: Int? = null,
    val permissions: HeartbeatPermissionsDto? = null,
)

@Serializable
data class HeartbeatResponseDto(
    @SerialName("server_time") val serverTime: String,
    @SerialName("monitored_packages") val monitoredPackages: List<String>,
    @SerialName("config_version") val configVersion: Int,
)

@Serializable
data class DeviceConfigResponseDto(
    @SerialName("monitored_packages") val monitoredPackages: List<String>,
    @SerialName("heartbeat_interval_seconds") val heartbeatIntervalSeconds: Int,
    @SerialName("ingest_batch_size") val ingestBatchSize: Int,
    @SerialName("config_version") val configVersion: Int,
)

@Serializable
data class MobileOverviewResponseDto(
    val tenant: MobileTenantDto,
    val device: MobileDeviceDto,
    val wallets: List<MobileWalletDto>,
    val subscription: MobileSubscriptionDto? = null,
    @SerialName("recent_activity") val recentActivity: List<MobileTransactionDto>,
)

@Serializable
data class MobileTenantDto(
    val id: String,
    @SerialName("business_name") val businessName: String,
)

@Serializable
data class MobileDeviceDto(
    val id: String,
    val label: String,
)

@Serializable
data class MobileWalletDto(
    val code: String,
    @SerialName("display_name") val displayName: String,
)

@Serializable
data class MobileSubscriptionDto(
    @SerialName("plan_code") val planCode: String,
    @SerialName("plan_name") val planName: String,
    val status: String,
    @SerialName("access_state") val accessState: String,
    @SerialName("period_end") val periodEnd: String,
    @SerialName("transactions_used") val transactionsUsed: Int,
    @SerialName("transactions_limit") val transactionsLimit: Int,
    val trial: MobileTrialDto? = null,
)

@Serializable
data class MobileTrialDto(
    @SerialName("ends_at") val endsAt: String? = null,
    @SerialName("transactions_today") val transactionsToday: Int,
    @SerialName("transactions_total") val transactionsTotal: Int,
    @SerialName("daily_reset_at") val dailyResetAt: String? = null,
)

@Serializable
data class MobileTransactionDto(
    val id: String,
    val wallet: MobileWalletDto,
    @SerialName("sender_name") val senderName: String? = null,
    val amount: String,
    val currency: String,
    val status: String,
    @SerialName("occurred_at") val occurredAt: String,
)

@Serializable
data class IngestNotificationItemDto(
    @SerialName("client_ref") val clientRef: String,
    @SerialName("package_name") val packageName: String,
    val title: String? = null,
    val body: String? = null,
    @SerialName("posted_at") val postedAt: String,
)

@Serializable
data class IngestNotificationsRequestDto(
    val notifications: List<IngestNotificationItemDto>,
)

@Serializable
data class IngestAcceptedItemDto(
    @SerialName("client_ref") val clientRef: String,
    @SerialName("notification_id") val notificationId: String,
    val status: String,
)

@Serializable
data class IngestRejectedItemDto(
    @SerialName("client_ref") val clientRef: String,
    val reason: String,
)

@Serializable
data class IngestNotificationsResponseDto(
    val accepted: List<IngestAcceptedItemDto>,
    val rejected: List<IngestRejectedItemDto>,
)

@Serializable
data class ApiErrorEnvelopeDto(
    val error: ApiErrorDto,
)

@Serializable
data class ApiErrorDto(
    val code: String,
    val message: String,
    @SerialName("request_id") val requestId: String? = null,
)
