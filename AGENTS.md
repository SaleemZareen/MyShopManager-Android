# Developer and AI Coding Agent Rules

This project is a 100% Native Android Application built purely using Kotlin and Jetpack Compose (Material 3).

## 1. Native Layout & Safe Area Guidelines
- The application uses native Jetpack Compose `Scaffold`, `TopAppBar`, and `Modifier.statusBarsPadding()` / `Modifier.safeDrawingPadding()`.
- System bars (Status Bar and Navigation Bar) are handled cleanly via Compose WindowInsets.

## 2. Navigation & Architecture
- Architecture: MVVM + Clean State Flow.
- Native Back Handling: Handled via `BackHandler` and centralized Compose navigation state.
- Persistence: JSON persistence and Room / SharedPreferences integration on device.
