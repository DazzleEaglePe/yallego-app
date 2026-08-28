package app.yallego.capture.domain.usecase

import android.os.Build
import app.yallego.capture.BuildConfig
import app.yallego.capture.data.local.datastore.RemoteConfigPreferences
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.domain.model.DeviceCallResult
import app.yallego.capture.domain.model.DeviceMetadata
import app.yallego.capture.domain.model.PairingResult
import app.yallego.capture.domain.repository.DeviceRepository
import javax.inject.Inject

/**
 * Canjea el código de vinculación por un token de dispositivo y deja la app
 * lista para operar: persiste la credencial y cachea la configuración inicial.
 */
class PairDeviceUseCase @Inject constructor(
    private val repository: DeviceRepository,
    private val credentialsStore: DeviceCredentialsStore,
    private val remoteConfigPreferences: RemoteConfigPreferences,
) {
    suspend operator fun invoke(rawCode: String): DeviceCallResult<PairingResult> {
        val metadata = DeviceMetadata(
            manufacturer = Build.MANUFACTURER,
            model = Build.MODEL,
            osVersion = Build.VERSION.RELEASE,
            appVersion = BuildConfig.VERSION_NAME,
        )

        val result = repository.pair(canonicalize(rawCode), metadata)
        if (result is DeviceCallResult.Success) {
            val pairing = result.value
            credentialsStore.savePairing(pairing.deviceId, pairing.deviceToken, pairing.businessName)
            remoteConfigPreferences.save(pairing.monitoredPackages, configVersion = 0)
        }
        return result
    }

    /** Acepta el código con o sin guion, y lo escaneado desde el QR (`yallego://pair?code=...`). */
    private fun canonicalize(rawCode: String): String {
        val fromDeepLink = Regex("code=([A-Za-z0-9-]+)").find(rawCode)?.groupValues?.get(1)
        return (fromDeepLink ?: rawCode).trim()
    }
}
