package app.yallego.capture.di

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import app.yallego.capture.data.local.database.AppDatabase
import app.yallego.capture.data.local.database.NotificationQueueDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "yallego.db")
            .addMigrations(MIGRATION_1_2)
            .build()

    @Provides
    fun provideNotificationQueueDao(database: AppDatabase): NotificationQueueDao =
        database.notificationQueueDao()

    private val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS queued_notifications (
                    client_ref TEXT NOT NULL PRIMARY KEY,
                    package_name TEXT NOT NULL,
                    title TEXT,
                    body TEXT,
                    posted_at_epoch_ms INTEGER NOT NULL,
                    created_at_epoch_ms INTEGER NOT NULL,
                    attempt_count INTEGER NOT NULL,
                    last_error TEXT
                )
                """.trimIndent(),
            )
            db.execSQL(
                "CREATE INDEX IF NOT EXISTS index_queued_notifications_created_at_epoch_ms " +
                    "ON queued_notifications(created_at_epoch_ms)",
            )
            db.execSQL("DROP TABLE IF EXISTS _database_marker")
        }
    }
}
