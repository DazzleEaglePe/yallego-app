package app.yallego.capture.data.remote.interceptor

import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

/**
 * Agrega el token de dispositivo cuando existe. La vinculación
 * (`POST /internal/v1/devices/pair`) se llama antes de tener token: en ese
 * caso la solicitud sale sin cabecera `Authorization`, tal como espera el
 * servidor (docs/06_API_CONTRACT.md §13: "sin autenticación previa").
 */
class DeviceAuthInterceptor @Inject constructor(
    private val credentialsStore: DeviceCredentialsStore,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = credentialsStore.deviceToken
        val request = chain.request().let { original ->
            if (token == null) {
                original
            } else {
                original.newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
            }
        }
        return chain.proceed(request)
    }
}
