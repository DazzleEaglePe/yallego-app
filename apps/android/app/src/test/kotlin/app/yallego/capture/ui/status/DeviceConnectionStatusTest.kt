package app.yallego.capture.ui.status

import org.junit.Assert.assertEquals
import org.junit.Test

class DeviceConnectionStatusTest {
    private val now = 1_800_000L

    @Test
    fun reportsOnlineBeforeThreeMinutes() {
        assertEquals(DeviceConnectionStatus.ONLINE, resolveDeviceConnection(now - 179_999, now))
    }

    @Test
    fun reportsDelayedBetweenThreeAndSixMinutes() {
        assertEquals(DeviceConnectionStatus.DELAYED, resolveDeviceConnection(now - 180_000, now))
        assertEquals(DeviceConnectionStatus.DELAYED, resolveDeviceConnection(now - 359_999, now))
    }

    @Test
    fun reportsOfflineAfterSixMinutesOrWithoutSignal() {
        assertEquals(DeviceConnectionStatus.OFFLINE, resolveDeviceConnection(now - 360_000, now))
        assertEquals(DeviceConnectionStatus.OFFLINE, resolveDeviceConnection(null, now))
    }
}
