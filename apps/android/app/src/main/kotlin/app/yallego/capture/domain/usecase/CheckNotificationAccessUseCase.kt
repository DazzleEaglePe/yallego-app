package app.yallego.capture.domain.usecase

import android.content.Context
import androidx.core.app.NotificationManagerCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

/**
 * El acceso a notificaciones no se "solicita" con un diálogo del sistema: el
 * usuario lo concede manualmente en Ajustes. La app solo puede detectar si ya
 * está concedido (docs/08_UX_FLUJOS.md §4, Pantalla 3: "Detección automática al regresar").
 */
class CheckNotificationAccessUseCase @Inject constructor(@ApplicationContext private val context: Context) {
    operator fun invoke(): Boolean =
        NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
}
