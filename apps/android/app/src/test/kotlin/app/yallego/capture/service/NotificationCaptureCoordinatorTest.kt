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

    @Test
    fun `empty notification is not considered capturable content`() {
        assertEquals(false, hasNotificationContent(null, null))
        assertEquals(true, hasNotificationContent("Confirmación de Pago", null))
        assertEquals(true, hasNotificationContent(null, "Yape! Persona te envió un pago por S/ 1"))
    }
}
