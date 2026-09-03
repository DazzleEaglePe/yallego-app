package app.yallego.capture.data.local.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Estado local del dispositivo que no es secreto (a diferencia del token, que
 * vive en `DeviceCredentialsStore`): la copia de la configuración remota
 * (`GET /internal/v1/config`) y la marca de la última señal de vida enviada.
 */
@Singleton
class RemoteConfigPreferences @Inject constructor(private val dataStore: DataStore<Preferences>) {

    val monitoredPackages: Flow<Set<String>> =
        dataStore.data.map { it[MONITORED_PACKAGES] ?: emptySet() }

    val configVersion: Flow<Int> =
        dataStore.data.map { it[CONFIG_VERSION] ?: 0 }

    val ingestBatchSize: Flow<Int> =
        dataStore.data.map { it[INGEST_BATCH_SIZE] ?: DEFAULT_INGEST_BATCH_SIZE }

    val lastHeartbeatAtEpochMs: Flow<Long?> =
        dataStore.data.map { it[LAST_HEARTBEAT_AT] }

    suspend fun save(
        monitoredPackages: List<String>,
        configVersion: Int,
        ingestBatchSize: Int? = null,
    ) {
        dataStore.edit { preferences ->
            preferences[MONITORED_PACKAGES] = monitoredPackages.toSet()
            preferences[CONFIG_VERSION] = configVersion
            if (ingestBatchSize != null) {
                preferences[INGEST_BATCH_SIZE] = ingestBatchSize.coerceIn(1, MAX_INGEST_BATCH_SIZE)
            }
        }
    }

    suspend fun recordHeartbeat(epochMs: Long) {
        dataStore.edit { preferences -> preferences[LAST_HEARTBEAT_AT] = epochMs }
    }

    suspend fun clear() {
        dataStore.edit { it.clear() }
    }

    private companion object {
        val MONITORED_PACKAGES = stringSetPreferencesKey("monitored_packages")
        val CONFIG_VERSION = intPreferencesKey("config_version")
        val INGEST_BATCH_SIZE = intPreferencesKey("ingest_batch_size")
        val LAST_HEARTBEAT_AT = longPreferencesKey("last_heartbeat_at")
        const val DEFAULT_INGEST_BATCH_SIZE = 50
        const val MAX_INGEST_BATCH_SIZE = 50
    }
}
