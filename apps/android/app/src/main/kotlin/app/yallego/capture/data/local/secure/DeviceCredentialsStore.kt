package app.yallego.capture.data.local.secure

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Persistencia cifrada del token de dispositivo (docs/07_SEGURIDAD_AUTH.md §4.2:
 * "Almacenamiento cifrado del sistema"). Nunca se guarda en `SharedPreferences`
 * planas ni en la base de datos local.
 */
@Singleton
class DeviceCredentialsStore @Inject constructor(@ApplicationContext context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val preferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        FILE_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    val isPaired: Boolean
        get() = deviceToken != null

    var deviceToken: String?
        get() = preferences.getString(KEY_DEVICE_TOKEN, null)
        private set(value) = preferences.edit().putString(KEY_DEVICE_TOKEN, value).apply()

    var deviceId: String?
        get() = preferences.getString(KEY_DEVICE_ID, null)
        private set(value) = preferences.edit().putString(KEY_DEVICE_ID, value).apply()

    var businessName: String?
        get() = preferences.getString(KEY_BUSINESS_NAME, null)
        private set(value) = preferences.edit().putString(KEY_BUSINESS_NAME, value).apply()

    fun savePairing(deviceId: String, deviceToken: String, businessName: String) {
        preferences.edit()
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_DEVICE_TOKEN, deviceToken)
            .putString(KEY_BUSINESS_NAME, businessName)
            .apply()
    }

    /** El servidor confirmó la revocación, o el usuario desvinculó el celular desde ajustes. */
    fun clear() {
        preferences.edit().clear().apply()
    }

    private companion object {
        const val FILE_NAME = "yallego_device_credentials"
        const val KEY_DEVICE_TOKEN = "device_token"
        const val KEY_DEVICE_ID = "device_id"
        const val KEY_BUSINESS_NAME = "business_name"
    }
}
