package app.yallego.capture.data.local.database

import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Entity(
    tableName = "queued_notifications",
    indices = [Index(value = ["created_at_epoch_ms"])],
)
data class QueuedNotificationEntity(
    @PrimaryKey
    @ColumnInfo(name = "client_ref")
    val clientRef: String,
    @ColumnInfo(name = "package_name")
    val packageName: String,
    val title: String?,
    val body: String?,
    @ColumnInfo(name = "posted_at_epoch_ms")
    val postedAtEpochMs: Long,
    @ColumnInfo(name = "created_at_epoch_ms")
    val createdAtEpochMs: Long,
    @ColumnInfo(name = "attempt_count")
    val attemptCount: Int,
    @ColumnInfo(name = "last_error")
    val lastError: String?,
)

@Dao
interface NotificationQueueDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun enqueue(notification: QueuedNotificationEntity): Long

    @Query("SELECT * FROM queued_notifications ORDER BY created_at_epoch_ms ASC LIMIT :limit")
    suspend fun nextBatch(limit: Int): List<QueuedNotificationEntity>

    @Query("DELETE FROM queued_notifications WHERE client_ref IN (:clientRefs)")
    suspend fun deleteConfirmed(clientRefs: List<String>): Int

    @Query(
        """
        UPDATE queued_notifications
        SET attempt_count = attempt_count + 1,
            last_error = :message
        WHERE client_ref IN (:clientRefs)
        """,
    )
    suspend fun recordFailure(clientRefs: List<String>, message: String): Int

    @Query("SELECT COUNT(*) FROM queued_notifications")
    suspend fun countPending(): Int

    @Query("SELECT COUNT(*) FROM queued_notifications")
    fun observePendingCount(): Flow<Int>
}
