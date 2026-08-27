package app.yallego.capture.service

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationCaptureCoordinatorTest {
    @Test
    fun `sanitizer trims notification text`() {
        assertEquals("Pago recibido", sanitizeNotificationField("  Pago recibido  ", 100))
    }

    @Test
    fun `sanitizer converts blank text to null`() {
        assertNull(sanitizeNotificationField("  \n  ", 100))
        assertNull(sanitizeNotificationField(null, 100))
    }

    @Test
    fun `sanitizer enforces API length limit`() {
        assertEquals("12345", sanitizeNotificationField("123456789", 5))
    }
}
