package app.yallego.capture.worker

import app.yallego.capture.data.local.database.NotificationQueueDao
import app.yallego.capture.data.local.database.QueuedNotificationEntity
import app.yallego.capture.data.remote.dto.IngestNotificationsResponseDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response

class NotificationSyncWorkerTest {

    @Test
    fun `HTTP 422 conserva el cobro en cola y registra el intento`() = runBlocking {
        val notification = queuedNotification("cobro-limite")
        val queue = FakeNotificationQueueDao(notification)
        val response = Response.error<IngestNotificationsResponseDto>(
            422,
            """{"error":{"code":"PLAN_LIMIT_EXCEEDED"}}""".toResponseBody(),
        )

        val result = handleIngestResponse(queue, listOf(notification), response)

        assertEquals(BatchSyncResult.RETRY, result)
        assertTrue(queue.deletedClientRefs.isEmpty())
        assertEquals(listOf("cobro-limite"), queue.nextBatch(10).map { it.clientRef })
        assertEquals(1, queue.nextBatch(10).single().attemptCount)
        assertEquals("Ingesta HTTP 422", queue.nextBatch(10).single().lastError)
    }

    private fun queuedNotification(clientRef: String) = QueuedNotificationEntity(
        clientRef = clientRef,
        packageName = "com.bcp.innovacxion.yapeapp",
        title = "Pago recibido",
        body = "Recibiste S/ 1.00",
        postedAtEpochMs = 1_700_000_000_000,
        createdAtEpochMs = 1_700_000_000_100,
        attemptCount = 0,
        lastError = null,
    )
}

private class FakeNotificationQueueDao(
    vararg notifications: QueuedNotificationEntity,
) : NotificationQueueDao {
    private val pending = notifications.associateByTo(linkedMapOf()) { it.clientRef }
    val deletedClientRefs = mutableListOf<String>()

    override suspend fun enqueue(notification: QueuedNotificationEntity): Long {
        if (pending.putIfAbsent(notification.clientRef, notification) != null) return -1
        return pending.size.toLong()
    }

    override suspend fun nextBatch(limit: Int): List<QueuedNotificationEntity> =
        pending.values.sortedBy { it.createdAtEpochMs }.take(limit)

    override suspend fun deleteConfirmed(clientRefs: List<String>): Int {
        deletedClientRefs += clientRefs
        return clientRefs.count { pending.remove(it) != null }
    }

    override suspend fun recordFailure(clientRefs: List<String>, message: String): Int {
        var updated = 0
        clientRefs.forEach { clientRef ->
            pending.computeIfPresent(clientRef) { _, notification ->
                updated += 1
                notification.copy(
                    attemptCount = notification.attemptCount + 1,
                    lastError = message,
                )
            }
        }
        return updated
    }

    override suspend fun countPending(): Int = pending.size

    override fun observePendingCount(): Flow<Int> = flowOf(pending.size)
}
