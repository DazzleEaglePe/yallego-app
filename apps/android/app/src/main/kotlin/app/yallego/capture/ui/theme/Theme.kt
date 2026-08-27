package app.yallego.capture.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp

private val LightColors = lightColorScheme(
    primary = Brand600,
    onPrimary = Neutral0,
    primaryContainer = Brand100,
    onPrimaryContainer = Brand900,
    secondary = Brand500,
    background = Neutral0,
    onBackground = Neutral900,
    surface = Neutral0,
    onSurface = Neutral900,
    surfaceVariant = Neutral100,
    onSurfaceVariant = Neutral600,
    outline = Neutral300,
    error = Danger600,
)

private val DarkColors = darkColorScheme(
    primary = AppBlueBright,
    onPrimary = AppInk,
    primaryContainer = Brand800,
    onPrimaryContainer = Brand100,
    secondary = AppCyan,
    onSecondary = AppInk,
    background = AppInk,
    onBackground = Neutral50,
    surface = AppSurface,
    onSurface = Neutral50,
    surfaceVariant = AppSurfaceElevated,
    onSurfaceVariant = AppTextSecondary,
    outline = AppBorder,
    outlineVariant = AppBorder.copy(alpha = 0.65f),
    error = DangerBright,
    scrim = AppInk,
)

private val YallegoShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(26.dp),
    extraLarge = RoundedCornerShape(34.dp),
)

@Composable
fun YallegoTheme(darkTheme: Boolean = true, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = YallegoTypography,
        shapes = YallegoShapes,
        content = content,
    )
}
