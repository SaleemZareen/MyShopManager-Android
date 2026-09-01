package com.saleemkhan.myshopmanager.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

val LocalIsUrdu = compositionLocalOf { false }

private val LightColorScheme = lightColorScheme(
    primary = DukanGreenPrimary,
    onPrimary = Color.White,
    primaryContainer = DukanGreenLight,
    onPrimaryContainer = DukanGreenHover,
    secondary = DukanGoldSecondary,
    onSecondary = Slate900,
    secondaryContainer = DukanGoldLight,
    onSecondaryContainer = Slate900,
    background = Slate50,
    onBackground = Slate900,
    surface = Color.White,
    onSurface = Slate900,
    surfaceVariant = Slate100,
    onSurfaceVariant = Slate700,
    outline = Slate200,
    outlineVariant = Slate300
)

val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp)
)

@Composable
fun MyShopManagerTheme(
    isUrdu: Boolean = false,
    content: @Composable () -> Unit
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = Color.White.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
            }
        }
    }

    val layoutDirection = if (isUrdu) LayoutDirection.Rtl else LayoutDirection.Ltr

    CompositionLocalProvider(
        LocalIsUrdu provides isUrdu,
        LocalLayoutDirection provides layoutDirection
    ) {
        MaterialTheme(
            colorScheme = LightColorScheme,
            typography = Typography,
            shapes = AppShapes,
            content = content
        )
    }
}
