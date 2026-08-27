package app.yallego.capture.data.repository

import app.yallego.capture.data.remote.api.InternalApi
import app.yallego.capture.data.remote.dto.ApiErrorEnvelopeDto
import app.yallego.capture.data.remote.dto.DeviceMetadataDto
import app.yallego.capture.data.remote.dto.HeartbeatPermissionsDto
import app.yallego.capture.data.remote.dto.HeartbeatRequestDto
import app.yallego.capture.data.remote.dto.PairDeviceRequestDto
import app.yallego.capture.domain.model.DeviceCallResult
import app.yallego.capture.domain.model.DeviceMetadata
import app.yallego.capture.domain.model.HeartbeatOutcome
import app.yallego.capture.domain.model.PairingResult
import app.yallego.capture.domain.model.PermissionSnapshot
import app.yallego.capture.domain.model.RemoteConfig
import app.yallego.capture.domain.repository.DeviceRepository
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import retrofit2.Response
import timber.log.Timber
import java.io.IOException
import javax.inject.Inject

class DeviceRepositoryImpl @Inject constructor(
    private val api: InternalApi,
    private val json: Json,
) : DeviceRepository {

    override suspend fun pair(code: String, metadata: DeviceMetadata): DeviceCallResult<PairingResult> =
        safeCall {
            api.pairDevice(
                PairDeviceRequestDto(
                    code = code,
                    device = DeviceMetadataDto(
                        manufacturer = metadata.manufacturer,
                        model = metadata.model,
                        osVersion = metadata.osVersion,
                        appVersion = metadata.appVersion,
                    ),
                ),
            )
        }.map { body ->
            PairingResult(
                deviceId = body.deviceId,
                deviceToken = body.deviceToken,
                businessName = body.tenant.businessName,
                monitoredPackages = body.monitoredPackages,
            )
        }

    override suspend fun sendHeartbeat(
        appVersion: String,
        queueSize: Int,
        permissions: PermissionSnapshot,
    ): DeviceCallResult<HeartbeatOutcome> =
        safeCall {
            api.sendHeartbeat(
                HeartbeatRequestDto(
                    appVersion = appVersion,
                    queueSize = queueSize,
                    permissions = HeartbeatPermissionsDto(
                        notificationAccess = permissions.notificationAccessGranted,
                        batteryOptimizationDisabled = permissions.batteryOptimizationDisabled,
                    ),
                ),
            )
        }.map { body ->
            HeartbeatOutcome(
                serverTimeIso = body.serverTime,
                remoteConfig = RemoteConfig(body.monitoredPackages, body.configVersion),
            )
        }

    override suspend fun fetchRemoteConfig(): DeviceCallResult<RemoteConfig> =
        safeCall { api.getConfig() }.map { body ->
            RemoteConfig(body.monitoredPackages, body.configVersion, body.ingestBatchSize)
        }

    private fun <T, R> DeviceCallResult<T>.map(transform: (T) -> R): DeviceCallResult<R> = when (this) {
        is DeviceCallResult.Success -> DeviceCallResult.Success(transform(value))
        is DeviceCallResult.Failure -> this
    }

    private suspend fun <T> safeCall(request: suspend () -> Response<T>): DeviceCallResult<T> = try {
        val response = request()
        val body = response.body()
        if (response.isSuccessful && body != null) {
            DeviceCallResult.Success(body)
        } else {
            val envelope = parseErrorEnvelope(response)
            DeviceCallResult.Failure(
                envelope?.error?.message ?: "Ocurrió un error inesperado. Inténtalo de nuevo.",
                envelope?.error?.code,
            )
        }
    } catch (error: IOException) {
        Timber.w(error, "Network error calling the internal API")
        DeviceCallResult.Failure("Sin conexión con el servidor. Verifica tu internet.")
    } catch (error: SerializationException) {
        Timber.e(error, "Unexpected response shape from the internal API")
        DeviceCallResult.Failure("Ocurrió un error inesperado. Inténtalo de nuevo.")
    }

    private fun parseErrorEnvelope(response: Response<*>): ApiErrorEnvelopeDto? {
        val raw = response.errorBody()?.string() ?: return null
        return try {
            json.decodeFromString(ApiErrorEnvelopeDto.serializer(), raw)
        } catch (error: SerializationException) {
            Timber.w(error, "Could not parse the API error envelope")
            null
        }
    }
}
