package app.yallego.capture.data.local.database

import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.RoomDatabase

/**
 * Base de datos local. Sin entidades todavía: la cola persistente de
 * notificaciones (RF-CAP-007/009) es del Sprint 4 y se agrega aquí como la
 * primera entidad real. Mientras tanto, la entidad interna de inicialización
 * mantiene válido el esquema de Room sin adelantar el modelo de la cola.
 */
@Database(entities = [DatabaseMarkerEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase()

@Entity(tableName = "_database_marker")
internal data class DatabaseMarkerEntity(
    @PrimaryKey val id: Int = 0,
)
