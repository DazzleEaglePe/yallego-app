package app.yallego.capture.domain.repository

import app.yallego.capture.domain.model.DeviceCallResult
import app.yallego.capture.domain.model.DeviceMetadata
import app.yallego.capture.domain.model.HeartbeatOutcome
import app.yallego.capture.domain.model.PairingResult
import app.yallego.capture.domain.model.PermissionSnapshot
import app.yallego.capture.domain.model.RemoteConfig

interface DeviceRepository {
    suspend fun pair(code: String, metadata: DeviceMetadata): DeviceCallResult<PairingResult>
    suspend fun sendHeartbeat(
        appVersion: String,
        queueSize: Int,
        permissions: PermissionSnapshot,
    ): DeviceCallResult<HeartbeatOutcome>
    suspend fun fetchRemoteConfig(): DeviceCallResult<RemoteConfig>
}
