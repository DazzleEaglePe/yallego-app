package app.yallego.capture.data.remote.api

import app.yallego.capture.data.remote.dto.DeviceConfigResponseDto
import app.yallego.capture.data.remote.dto.HeartbeatRequestDto
import app.yallego.capture.data.remote.dto.HeartbeatResponseDto
import app.yallego.capture.data.remote.dto.IngestNotificationsRequestDto
import app.yallego.capture.data.remote.dto.IngestNotificationsResponseDto
import app.yallego.capture.data.remote.dto.PairDeviceRequestDto
import app.yallego.capture.data.remote.dto.PairDeviceResponseDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/** Superficie `/internal/v1` que consume esta app (docs/06_API_CONTRACT.md §13). */
interface InternalApi {

    @POST("internal/v1/devices/pair")
    suspend fun pairDevice(@Body request: PairDeviceRequestDto): Response<PairDeviceResponseDto>

    @POST("internal/v1/heartbeat")
    suspend fun sendHeartbeat(@Body request: HeartbeatRequestDto): Response<HeartbeatResponseDto>

    @GET("internal/v1/config")
    suspend fun getConfig(): Response<DeviceConfigResponseDto>

    @POST("internal/v1/ingest")
    suspend fun ingestNotifications(
        @Body request: IngestNotificationsRequestDto,
    ): Response<IngestNotificationsResponseDto>
}
