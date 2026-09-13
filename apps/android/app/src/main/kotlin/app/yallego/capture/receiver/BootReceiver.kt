package app.yallego.capture.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.yallego.capture.data.local.secure.DeviceCredentialsStore
import app.yallego.capture.service.CaptureForegroundService
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/** RF de servicio: "La cola local sobrevive a reinicios" implica que el servicio también debe hacerlo. */
@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    @Inject lateinit var credentialsStore: DeviceCredentialsStore

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!credentialsStore.isPaired) return

        CaptureForegroundService.start(context)
    }
}
