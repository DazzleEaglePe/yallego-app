package app.yallego.capture.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.yallego.capture.data.local.database.NotificationQueueDao
import app.yallego.capture.data.local.database.QueuedNotificationEntity
import app.yallego.capture.data.local.datastore.RemoteConfigPreferences
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.data.remote.api.InternalApi
import app.yallego.capture.data.remote.dto.IngestNotificationItemDto
import app.yallego.capture.data.remote.dto.IngestNotificationsRequestDto
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first
import timber.log.Timber
import java.io.IOException
import java.time.Instant
import java.util.concurrent.TimeUnit

/** Envía la cola persistente y solo elimina elementos confirmados por el API. */
@HiltWorker
class NotificationSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val queueDao: NotificationQueueDao,
    private val remoteConfig: RemoteConfigPreferences,
    private val credentialsStore: DeviceCredentialsStore,
    private val api: InternalApi,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        if (!credentialsStore.isPaired) return Result.success()

        val batchSize = remoteConfig.ingestBatchSize.first().coerceIn(1, MAX_BATCH_SIZE)
        repeat(MAX_BATCHES_PER_RUN) {
            val batch = queueDao.nextBatch(batchSize)
            if (batch.isEmpty()) return Result.success()

            val response = try {
                api.ingestNotifications(batch.toRequest())
            } catch (error: IOException) {
                return retry(batch, "Sin conexión con el servidor", error)
            } catch (error: RuntimeException) {
                return retry(batch, "Respuesta de ingesta inválida", error)
            }

            val body = response.body()
            if (!response.isSuccessful || body == null) {
                val message = "Ingesta HTTP ${response.code()}"
                queueDao.recordFailure(batch.map { it.clientRef }, message)
                Timber.w("%s; se conserva la cola", message)
                return Result.retry()
            }

            val confirmed = body.accepted.map { it.clientRef }.toSet()
            if (confirmed.isNotEmpty()) queueDao.deleteConfirmed(confirmed.toList())

            val unconfirmed = batch.map { it.clientRef }.filterNot(confirmed::contains)
            if (unconfirmed.isNotEmpty()) {
                val rejectedReasons = body.rejected.associate { it.clientRef to it.reason }
                val message = unconfirmed.joinToString { ref -> rejectedReasons[ref] ?: "Sin confirmación" }
                queueDao.recordFailure(unconfirmed, message.take(MAX_ERROR_LENGTH))
                Timber.w("El API no confirmó %d notificaciones", unconfirmed.size)
                return Result.retry()
            }

            Timber.i("Lote confirmado por el servidor: %d notificaciones", confirmed.size)
        }

        return if (queueDao.countPending() == 0) Result.success() else Result.retry()
    }

    private suspend fun retry(
        batch: List<QueuedNotificationEntity>,
        message: String,
        error: Throwable,
    ): Result {
        queueDao.recordFailure(batch.map { it.clientRef }, message)
        Timber.w(error, "%s; reintento %d", message, runAttemptCount + 1)
        return Result.retry()
    }

    private fun List<QueuedNotificationEntity>.toRequest() = IngestNotificationsRequestDto(
        notifications = map { queued ->
            IngestNotificationItemDto(
                clientRef = queued.clientRef,
                packageName = queued.packageName,
                title = queued.title,
                body = queued.body,
                postedAt = Instant.ofEpochMilli(queued.postedAtEpochMs).toString(),
            )
        },
    )

    companion object {
        private const val UNIQUE_WORK_NAME = "yallego_notification_sync"
        private const val MAX_BATCH_SIZE = 50
        private const val MAX_BATCHES_PER_RUN = 20
        private const val MAX_ERROR_LENGTH = 500

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<NotificationSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.APPEND_OR_REPLACE,
                request,
            )
        }
    }
}
