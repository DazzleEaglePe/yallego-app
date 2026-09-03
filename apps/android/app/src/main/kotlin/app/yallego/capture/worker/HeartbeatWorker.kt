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
 * Señal de vida (RF-DEV-006: cada 5 minutos). `PeriodicWorkRequest` de
 * WorkManager tiene un piso de 15 minutos, insuficiente aquí, así que este
 * trabajador se reprograma a sí mismo como trabajo único de 5 minutos al
 * terminar — programado por WorkManager, sobrevive mejor que un bucle atado
 * al ciclo de vida del servicio en primer plano.
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
            scheduleNext(applicationContext)
        }
        return Result.success()
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "yallego_heartbeat"
        private const val INTERVAL_MINUTES = 5L

        fun scheduleNext(context: Context, initialDelayMinutes: Long = INTERVAL_MINUTES) {
            val request = OneTimeWorkRequestBuilder<HeartbeatWorker>()
                .setInitialDelay(initialDelayMinutes, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.REPLACE, request)
        }

        /** Primer disparo inmediato: al vincular o al reiniciar el dispositivo. */
        fun scheduleNow(context: Context) {
            val request = OneTimeWorkRequestBuilder<HeartbeatWorker>().build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.REPLACE, request)
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK_NAME)
        }
    }
}
