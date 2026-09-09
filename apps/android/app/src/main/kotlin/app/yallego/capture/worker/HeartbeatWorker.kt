package app.yallego.capture.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.domain.model.DeviceCallResult
import app.yallego.capture.domain.usecase.SendHeartbeatUseCase
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import timber.log.Timber
import java.util.concurrent.TimeUnit

/**
 * Respaldo de la señal de vida. El servicio en primer plano envía el heartbeat
 * operativo cada 2 minutos; WorkManager despierta la app cada 15 minutos para
 * recuperar configuración si el servicio fue reiniciado o retrasado por Android.
 */
@HiltWorker
class HeartbeatWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val sendHeartbeat: SendHeartbeatUseCase,
    private val credentialsStore: DeviceCredentialsStore,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        if (!credentialsStore.isPaired) {
            return Result.success()
        }

        when (val outcome = sendHeartbeat()) {
            is DeviceCallResult.Success -> Timber.d("Heartbeat sent: %s", outcome.value.serverTimeIso)
            is DeviceCallResult.Failure -> Timber.w("Heartbeat failed: %s", outcome.message)
        }

        if (credentialsStore.isPaired) {
            appendNext(applicationContext)
        }
        return Result.success()
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "yallego_heartbeat"
        private const val BACKUP_INTERVAL_MINUTES = 15L

        private fun appendNext(context: Context) {
            val request = OneTimeWorkRequestBuilder<HeartbeatWorker>()
                .setInitialDelay(BACKUP_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }

        fun ensureBackupScheduled(context: Context) {
            val request = OneTimeWorkRequestBuilder<HeartbeatWorker>()
                .setInitialDelay(BACKUP_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.KEEP, request)
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK_NAME)
        }
    }
}
