package app.yallego.capture.domain.usecase

import android.content.Context
import android.os.PowerManager
import androidx.core.content.getSystemService
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class CheckBatteryOptimizationUseCase @Inject constructor(@ApplicationContext private val context: Context) {
    operator fun invoke(): Boolean =
        context.getSystemService<PowerManager>()?.isIgnoringBatteryOptimizations(context.packageName) ?: false
}
