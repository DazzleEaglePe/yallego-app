package app.yallego.capture.data.local.secure

import android.content.Context
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import dagger.hilt.android.qualifiers.ApplicationContext
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/** Identidad por instalación: la clave privada nunca abandona Android Keystore. */
@Singleton
class InstallationIdentity @Inject constructor(@ApplicationContext private val context: Context) {
    private val preferences = context.getSharedPreferences("yallego_installation", Context.MODE_PRIVATE)

    fun installationId(): String = preferences.getString("installation_id", null) ?: UUID.randomUUID().toString()
        .also { preferences.edit().putString("installation_id", it).apply() }

    fun androidId(): String = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)

    fun publicKey(): String = Base64.encodeToString(keyPair().public.encoded, Base64.NO_WRAP)

    fun sign(payload: String): String {
        val signer = Signature.getInstance("SHA256withECDSA")
        signer.initSign(keyPair().private)
        signer.update(payload.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(signer.sign(), Base64.NO_WRAP)
    }

    private fun keyPair(): java.security.KeyPair {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = store.getEntry(ALIAS, null) as? KeyStore.PrivateKeyEntry
        if (existing != null) return java.security.KeyPair(existing.certificate.publicKey, existing.privateKey)
        return KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore").apply {
            initialize(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_SIGN)
                .setDigests(KeyProperties.DIGEST_SHA256).build())
        }.generateKeyPair()
    }

    private companion object { const val ALIAS = "yallego_installation_signing_v1" }
}
