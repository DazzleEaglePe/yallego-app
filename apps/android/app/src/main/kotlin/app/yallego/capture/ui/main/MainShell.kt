package app.yallego.capture.ui.main

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import app.yallego.capture.R
import app.yallego.capture.ui.status.MobileOverviewState
import app.yallego.capture.ui.status.StatusScreen
import app.yallego.capture.ui.status.StatusUiState
import app.yallego.capture.ui.theme.AppBlueBright
import app.yallego.capture.ui.theme.AppInk
import app.yallego.capture.ui.theme.AppSurface
import app.yallego.capture.ui.theme.AppTextTertiary

private enum class MainTab(
    val labelRes: Int,
    val icon: ImageVector,
) {
    HOME(R.string.nav_home, Icons.Rounded.Home),
    ACTIVITY(R.string.nav_activity, Icons.Rounded.ReceiptLong),
    MORE(R.string.nav_more, Icons.Rounded.MoreHoriz),
}

@Composable
fun MainShell(
    statusState: StatusUiState,
    overviewState: MobileOverviewState,
    onRefresh: () -> Unit,
    onOpenNotificationSettings: () -> Unit,
    onOpenBatterySettings: () -> Unit,
    onOpenAppSettings: () -> Unit,
    onOpenDashboard: () -> Unit,
) {
    var selectedTab by remember { mutableStateOf(MainTab.HOME) }

    Scaffold(
        containerColor = AppInk,
        bottomBar = {
            NavigationBar(containerColor = AppSurface, contentColor = Color.White) {
                MainTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = stringResource(tab.labelRes)) },
                        label = { Text(stringResource(tab.labelRes)) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = AppBlueBright,
                            selectedTextColor = Color.White,
                            indicatorColor = AppBlueBright.copy(alpha = 0.14f),
                            unselectedIconColor = AppTextTertiary,
                            unselectedTextColor = AppTextTertiary,
                        ),
                    )
                }
            }
        },
    ) { contentPadding ->
        AnimatedContent(
            targetState = selectedTab,
            modifier = Modifier.padding(contentPadding),
            transitionSpec = {
                val direction = if (targetState.ordinal > initialState.ordinal) {
                    AnimatedContentTransitionScope.SlideDirection.Left
                } else {
                    AnimatedContentTransitionScope.SlideDirection.Right
                }
                (slideIntoContainer(direction) + fadeIn())
                    .togetherWith(slideOutOfContainer(direction) + fadeOut())
            },
            label = "main-tab-transition",
        ) { tab ->
            when (tab) {
                MainTab.HOME -> StatusScreen(state = statusState)
                MainTab.ACTIVITY -> ActivityScreen(
                    overviewState = overviewState,
                    queueSize = statusState.queueSize,
                    onRefresh = onRefresh,
                )
                MainTab.MORE -> MoreScreen(
                    statusState = statusState,
                    overviewState = overviewState,
                    onRefresh = onRefresh,
                    onOpenNotificationSettings = onOpenNotificationSettings,
                    onOpenBatterySettings = onOpenBatterySettings,
                    onOpenAppSettings = onOpenAppSettings,
                    onOpenDashboard = onOpenDashboard,
                )
            }
        }
    }
}
