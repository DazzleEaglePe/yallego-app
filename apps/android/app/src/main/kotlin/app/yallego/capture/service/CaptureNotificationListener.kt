package app.yallego.capture.service

import android.app.Notification
import android.content.ComponentName
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

/**
 * Extrae únicamente el contenido crudo. El filtrado, persistencia y envío se
 * delegan al coordinador para no bloquear el hilo del sistema.
 */
@AndroidEntryPoint
class CaptureNotificationListener : NotificationListenerService() {
    @Inject lateinit var captureCoordinator: NotificationCaptureCoordinator

    private val reconcileHandler = Handler(Looper.getMainLooper())
    private val observedNotifications = LinkedHashSet<String>()
    private val reconcileRunnable = object : Runnable {
        override fun run() {
            reconcileActiveNotifications()
            reconcileHandler.postDelayed(this, RECONCILE_INTERVAL_MS)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName) return
        if (!rememberNotification(sbn)) return
        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val body = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
                ?.joinToString("\n") { it.toString() }

        captureCoordinator.capture(
            CapturedNotification(
                packageName = sbn.packageName,
                title = title,
                body = body,
                postedAtEpochMs = sbn.postTime,
                sourceKey = sbn.key,
            ),
        )
    }

    override fun onListenerConnected() {
        Timber.i("Escucha de notificaciones conectada")
        // MIUI puede omitir callbacks sin retirar el permiso ni desconectar el
        // listener. Reconciliamos también las notificaciones que siguen activas;
        // la referencia estable y el INSERT IGNORE evitan duplicados.
        reconcileHandler.removeCallbacks(reconcileRunnable)
        reconcileRunnable.run()
    }

    override fun onListenerDisconnected() {
        reconcileHandler.removeCallbacks(reconcileRunnable)
        Timber.w("Escucha de notificaciones desconectada; solicitando reconexión")
        requestRebind(ComponentName(this, CaptureNotificationListener::class.java))
    }

    override fun onDestroy() {
        reconcileHandler.removeCallbacks(reconcileRunnable)
        super.onDestroy()
    }

    private fun reconcileActiveNotifications() {
        runCatching { activeNotifications.orEmpty().forEach(::onNotificationPosted) }
            .onFailure { error ->
                Timber.w(error, "No se pudieron reconciliar las notificaciones activas")
            }
    }

    private fun rememberNotification(sbn: StatusBarNotification): Boolean {
        val identity = "${sbn.key}:${sbn.postTime}"
        if (!observedNotifications.add(identity)) return false

        if (observedNotifications.size > MAX_OBSERVED_NOTIFICATIONS) {
            observedNotifications.remove(observedNotifications.first())
        }
        return true
    }

    private companion object {
        const val MAX_OBSERVED_NOTIFICATIONS = 512
        const val RECONCILE_INTERVAL_MS = 30_000L
    }
}
