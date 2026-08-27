package app.yallego.capture.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [QueuedNotificationEntity::class], version = 2, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun notificationQueueDao(): NotificationQueueDao
}
