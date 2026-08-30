package app.yallego.capture.service

import android.app.Notification
import android.content.ComponentName
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

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName) return
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
        // MIUI puede desconectar temporalmente el listener aun conservando el
        // permiso. Al volver, recuperamos las notificaciones que siguen activas.
        activeNotifications.orEmpty().forEach(::onNotificationPosted)
    }

    override fun onListenerDisconnected() {
        Timber.w("Escucha de notificaciones desconectada; solicitando reconexión")
        requestRebind(ComponentName(this, CaptureNotificationListener::class.java))
    }
}
