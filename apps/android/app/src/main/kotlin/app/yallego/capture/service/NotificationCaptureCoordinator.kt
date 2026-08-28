package app.yallego.capture.service

import android.content.Context
import app.yallego.capture.data.local.database.NotificationQueueDao
import app.yallego.capture.data.local.database.QueuedNotificationEntity
import app.yallego.capture.data.local.datastore.RemoteConfigPreferences
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.worker.NotificationSyncWorker
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

data class CapturedNotification(
    val packageName: String,
    val title: String?,
    val body: String?,
    val postedAtEpochMs: Long,
)

@Singleton
class NotificationCaptureCoordinator @Inject constructor(
    @ApplicationContext private val context: Context,
    private val credentialsStore: DeviceCredentialsStore,
    private val remoteConfig: RemoteConfigPreferences,
    private val queueDao: NotificationQueueDao,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun capture(notification: CapturedNotification) {
        if (!credentialsStore.isPaired) return

        scope.launch {
            val monitoredPackages = remoteConfig.monitoredPackages.first()
            if (notification.packageName !in monitoredPackages) return@launch

            val title = sanitizeNotificationField(notification.title, 500)
            val body = sanitizeNotificationField(notification.body, 2_000)
            if (!hasNotificationContent(title, body)) {
                Timber.d("Notificación vacía ignorada: package=%s", notification.packageName)
                return@launch
            }

            val entity = QueuedNotificationEntity(
                clientRef = UUID.randomUUID().toString(),
                packageName = notification.packageName.take(255),
                title = title,
                body = body,
                postedAtEpochMs = notification.postedAtEpochMs,
                createdAtEpochMs = System.currentTimeMillis(),
                attemptCount = 0,
                lastError = null,
            )
            if (queueDao.enqueue(entity) != -1L) {
                Timber.i("Notificación en cola: package=%s ref=%s", entity.packageName, entity.clientRef)
                NotificationSyncWorker.schedule(context)
            }
        }
    }
}

internal fun sanitizeNotificationField(value: String?, maxLength: Int): String? =
    value?.trim()?.takeIf { it.isNotEmpty() }?.take(maxLength)

internal fun hasNotificationContent(title: String?, body: String?): Boolean = title != null || body != null
