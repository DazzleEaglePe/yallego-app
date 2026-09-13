package app.yallego.capture.domain.usecase

import app.yallego.capture.data.local.datastore.RemoteConfigPreferences
import app.yallego.capture.domain.model.DeviceCallResult
import app.yallego.capture.domain.model.RemoteConfig
import app.yallego.capture.domain.repository.DeviceRepository
import javax.inject.Inject

class RefreshRemoteConfigUseCase @Inject constructor(
    private val repository: DeviceRepository,
    private val remoteConfigPreferences: RemoteConfigPreferences,
) {
    suspend operator fun invoke(): DeviceCallResult<RemoteConfig> {
        val result = repository.fetchRemoteConfig()
        if (result is DeviceCallResult.Success) {
            remoteConfigPreferences.save(
                result.value.monitoredPackages,
                result.value.configVersion,
                result.value.ingestBatchSize,
            )
        }
        return result
    }
}
