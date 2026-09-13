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
            """{"error":{"code":"PLAN_LIMIT_EXCEEDED","message":"Límite alcanzado"}}""".toResponseBody(),
        )

        val result = handleIngestResponse(queue, listOf(notification), response)

        assertEquals(BatchSyncResult.RETRY, result)
        assertTrue(queue.deletedClientRefs.isEmpty())
        assertEquals(listOf("cobro-limite"), queue.all().map { it.clientRef })
        assertEquals(1, queue.all().single().attemptCount)
        assertEquals("PLAN_LIMIT_EXCEEDED", queue.all().single().lastError)
    }

    @Test
    fun `suscripción requerida pausa la cola durante la ventana de recuperación`() = runBlocking {
        val notification = queuedNotification("cobro-suscripcion")
        val queue = FakeNotificationQueueDao(notification)
        val response = Response.error<IngestNotificationsResponseDto>(
            402,
            """{"error":{"code":"SUBSCRIPTION_REQUIRED","message":"Elige un plan"}}""".toResponseBody(),
        )

        val result = handleIngestResponse(queue, listOf(notification), response)

        assertEquals(BatchSyncResult.SUBSCRIPTION_PAUSED, result)
        assertEquals(SUBSCRIPTION_REQUIRED, queue.all().single().blockedReason)
        assertTrue(queue.all().single().blockedAtEpochMs != null)
        assertTrue(queue.all().single().retryAfterEpochMs!! > System.currentTimeMillis())
    }

    @Test
    fun `límite diario aplaza la cola sin marcar suscripción requerida`() = runBlocking {
        val notification = queuedNotification("cobro-diario")
        val queue = FakeNotificationQueueDao(notification)
        val response = Response.success(
            IngestNotificationsResponseDto(
                accepted = emptyList(),
                rejected = listOf(app.yallego.capture.data.remote.dto.IngestRejectedItemDto("cobro-diario", DAILY_LIMIT_EXCEEDED)),
            ),
        )

        val result = handleIngestResponse(queue, listOf(notification), response)

        assertEquals(BatchSyncResult.DAILY_DEFERRED, result)
        assertEquals(DAILY_LIMIT_EXCEEDED, queue.all().single().blockedReason)
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

    override suspend fun nextBatch(limit: Int, nowEpochMs: Long): List<QueuedNotificationEntity> =
        pending.values
            .filter { it.retryAfterEpochMs == null || it.retryAfterEpochMs <= nowEpochMs }
            .sortedBy { it.createdAtEpochMs }
            .take(limit)

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

    override suspend fun defer(
        clientRefs: List<String>,
        reason: String,
        message: String,
        blockedAtEpochMs: Long,
        retryAfterEpochMs: Long,
    ): Int {
        var updated = 0
        clientRefs.forEach { clientRef ->
            pending.computeIfPresent(clientRef) { _, notification ->
                updated += 1
                notification.copy(
                    attemptCount = notification.attemptCount + 1,
                    lastError = message,
                    blockedReason = reason,
                    blockedAtEpochMs = if (notification.blockedReason == reason) {
                        notification.blockedAtEpochMs
                    } else {
                        blockedAtEpochMs
                    },
                    retryAfterEpochMs = retryAfterEpochMs,
                )
            }
        }
        return updated
    }

    override suspend fun deleteExpiredSubscriptionBlocks(cutoffEpochMs: Long): Int {
        val expired = pending.values
            .filter { it.blockedReason == SUBSCRIPTION_REQUIRED && (it.blockedAtEpochMs ?: Long.MAX_VALUE) <= cutoffEpochMs }
            .map { it.clientRef }
        expired.forEach(pending::remove)
        return expired.size
    }

    override suspend fun countPending(): Int = pending.size

    override fun observePendingCount(): Flow<Int> = flowOf(pending.size)

    fun all(): List<QueuedNotificationEntity> = pending.values.toList()
}
