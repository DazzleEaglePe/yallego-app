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
import app.yallego.capture.data.remote.dto.ApiErrorEnvelopeDto
import app.yallego.capture.data.remote.dto.IngestNotificationItemDto
import app.yallego.capture.data.remote.dto.IngestNotificationsRequestDto
import app.yallego.capture.data.remote.dto.IngestNotificationsResponseDto
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first
import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import retrofit2.Response
import timber.log.Timber
import java.io.IOException
import java.time.Instant
import java.util.concurrent.TimeUnit

private const val MAX_ERROR_LENGTH = 500
private const val DEFERRED_RECHECK_DELAY_MS = 60 * 60 * 1_000L
private const val SUBSCRIPTION_QUEUE_RETENTION_MS = 24 * 60 * 60 * 1_000L
internal const val DAILY_LIMIT_EXCEEDED = "DAILY_LIMIT_EXCEEDED"
internal const val SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED"
private val errorJson = Json { ignoreUnknownKeys = true }

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

        val now = System.currentTimeMillis()
        val expired = queueDao.deleteExpiredSubscriptionBlocks(now - SUBSCRIPTION_QUEUE_RETENTION_MS)
        if (expired > 0) Timber.i("Se descartaron %d notificaciones tras 24 h sin suscripción", expired)

        val batchSize = remoteConfig.ingestBatchSize.first().coerceIn(1, MAX_BATCH_SIZE)
        repeat(MAX_BATCHES_PER_RUN) {
            val batch = queueDao.nextBatch(batchSize, System.currentTimeMillis())
            if (batch.isEmpty()) return Result.success()

            val response = try {
                api.ingestNotifications(batch.toRequest())
            } catch (error: IOException) {
                return retry(batch, "Sin conexión con el servidor", error)
            } catch (error: RuntimeException) {
                return retry(batch, "Respuesta de ingesta inválida", error)
            }

            when (handleIngestResponse(queueDao, batch, response)) {
                BatchSyncResult.RETRY -> return Result.retry()
                BatchSyncResult.DAILY_DEFERRED,
                BatchSyncResult.SUBSCRIPTION_PAUSED,
                -> {
                    schedule(applicationContext, DEFERRED_RECHECK_DELAY_MS)
                    return Result.success()
                }
                BatchSyncResult.CONFIRMED -> Unit
            }
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

        fun schedule(context: Context, delayMs: Long = 0) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<NotificationSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.APPEND_OR_REPLACE,
                request,
            )
        }
    }
}

internal enum class BatchSyncResult {
    CONFIRMED,
    RETRY,
    DAILY_DEFERRED,
    SUBSCRIPTION_PAUSED,
}

/**
 * Aplica la confirmación del API a la cola local.
 *
 * Los límites diarios se aplazan para no consumir reintentos continuamente. Una
 * suscripción requerida mantiene la cola solo por 24 horas; el worker vuelve a
 * comprobarla cada hora y la reanuda automáticamente cuando el servidor acepta
 * de nuevo los cobros tras un upgrade.
 */
internal suspend fun handleIngestResponse(
    queueDao: NotificationQueueDao,
    batch: List<QueuedNotificationEntity>,
    response: Response<IngestNotificationsResponseDto>,
): BatchSyncResult {
    val body = response.body()
    if (!response.isSuccessful || body == null) {
        val code = parseErrorCode(response)
        val message = code ?: "Ingesta HTTP ${response.code()}"
        val result = deferForBusinessLimit(queueDao, batch, code, message)
        if (result != null) return result
        queueDao.recordFailure(batch.map { it.clientRef }, message)
        Timber.w("%s; se conserva la cola", message)
        return BatchSyncResult.RETRY
    }

    val confirmed = body.accepted.map { it.clientRef }.toSet()
    if (confirmed.isNotEmpty()) queueDao.deleteConfirmed(confirmed.toList())

    val unconfirmed = batch.map { it.clientRef }.filterNot(confirmed::contains)
    if (unconfirmed.isNotEmpty()) {
        val rejectedReasons = body.rejected.associate { it.clientRef to it.reason }
        val reasons = unconfirmed.mapNotNull(rejectedReasons::get).toSet()
        val message = unconfirmed.joinToString { ref -> rejectedReasons[ref] ?: "Sin confirmación" }
        if (reasons.size == 1) {
            deferForBusinessLimit(queueDao, batch.filter { it.clientRef in unconfirmed }, reasons.single(), message)
                ?.let { return it }
        }
        queueDao.recordFailure(unconfirmed, message.take(MAX_ERROR_LENGTH))
        Timber.w("El API no confirmó %d notificaciones", unconfirmed.size)
        return BatchSyncResult.RETRY
    }

    Timber.i("Lote confirmado por el servidor: %d notificaciones", confirmed.size)
    return BatchSyncResult.CONFIRMED
}

private suspend fun deferForBusinessLimit(
    queueDao: NotificationQueueDao,
    batch: List<QueuedNotificationEntity>,
    code: String?,
    message: String,
): BatchSyncResult? {
    val result = when (code) {
        DAILY_LIMIT_EXCEEDED -> BatchSyncResult.DAILY_DEFERRED
        SUBSCRIPTION_REQUIRED -> BatchSyncResult.SUBSCRIPTION_PAUSED
        else -> return null
    }
    val now = System.currentTimeMillis()
    queueDao.defer(
        clientRefs = batch.map { it.clientRef },
        reason = code,
        message = message.take(MAX_ERROR_LENGTH),
        blockedAtEpochMs = now,
        retryAfterEpochMs = now + DEFERRED_RECHECK_DELAY_MS,
    )
    Timber.i("%s: %d cobros aplazados", code, batch.size)
    return result
}

private fun parseErrorCode(response: Response<*>): String? {
    val raw = response.errorBody()?.string() ?: return null
    return try {
        errorJson
            .decodeFromString<ApiErrorEnvelopeDto>(raw)
            .error
            .code
    } catch (error: SerializationException) {
        Timber.w(error, "No se pudo leer el código de error de ingesta")
        null
    }
}
