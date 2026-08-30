package app.yallego.capture.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.service.notification.NotificationListenerService
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import app.yallego.capture.MainActivity
import app.yallego.capture.R
import app.yallego.capture.worker.HeartbeatWorker
import app.yallego.capture.worker.NotificationSyncWorker
import dagger.hilt.android.AndroidEntryPoint

/**
 * Mantiene el proceso vivo con una notificación persistente, como exige el
 * sistema para servicios en primer plano de larga duración (RF-CAP-004).
 * También reactiva la sincronización de cualquier notificación que haya
 * quedado pendiente por falta de red o por un cierre anterior del proceso.
 *
 * Pendiente de verificar en dispositivo real (Sprint 8, rendimiento): Android
 * 14+ limita los servicios `dataSync` a ~6 horas acumuladas en segundo plano
 * por ventana de 24 horas. Si el sistema los corta, `HeartbeatWorker` sigue
 * despertando la app igual, pero conviene medir el efecto sobre la captura.
 */
@AndroidEntryPoint
class CaptureForegroundService : Service() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Algunos fabricantes conservan el permiso, pero dejan el listener sin
        // enlazar después de matar o actualizar el proceso. Al iniciar nuestro
        // servicio persistente solicitamos el enlace otra vez de forma idempotente.
        NotificationListenerService.requestRebind(
            ComponentName(this, CaptureNotificationListener::class.java),
        )
        HeartbeatWorker.scheduleNow(applicationContext)
        NotificationSyncWorker.schedule(applicationContext)
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification {
        val openApp = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openApp,
            PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.foreground_notification_title))
            .setContentText(getString(R.string.foreground_notification_text))
            // Ícono placeholder del sistema; reemplazar por el de marca antes de publicar.
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.notification_channel_service_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.notification_channel_service_description)
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        private const val CHANNEL_ID = "yallego_service"
        private const val NOTIFICATION_ID = 1001

        fun start(context: Context) {
            val intent = Intent(context, CaptureForegroundService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, CaptureForegroundService::class.java))
        }
    }
}
