# My Shop Manager (میری دکان مینیجر) — 100% Native Android App

A comprehensive native Android application built with **Kotlin** and **Jetpack Compose (Material Design 3)** for Pakistani shop owners, retailers, general stores, and sole proprietors to manage daily khata, POS sales, inventory, double-entry ledgers, and FBR IRIS tax return filing preparations.

---

## 🌟 Key Features

- **🌐 100% Bilingual Support**: Instant toggle between Urdu (اردو) and English across all screens.
- **📊 Real-time Dashboard**: Daily sales, estimated net profit, cash in hand, bank balances, customer credit (ادھار), and supplier payables.
- **🧾 POS & Quick Sales**: Instant receipt generation with stock deduction, custom discounts, and customer billing.
- **👥 Khata Module (گاہک اور سپلائر کھاتہ)**: Complete customer credit & supplier ledger with due dates, notes, and payment settlements.
- **📦 Inventory Management**: Categorized product list, cost vs selling prices, low stock alerts, and barcode/QR lookups.
- **💰 Cash & Bank Accounts**: Manage multiple physical cash tills, bank accounts, EasyPaisa, and JazzCash with funds transfer.
- **🏛️ FBR Tax & IRIS Preparation**: Income tax calculation under Pakistani Finance Act tax slabs, withholding tax reconciliations, and wealth statements.
- **📈 Reports & Visual Analytics**: Profit & Loss (P&L) statements, balance sheet summaries, and revenue growth charts.
- **🎙️ Urdu Voice Entry**: Hands-free voice assistant for recording transactions directly into the accounts.
- **🔒 On-Device Security & Privacy**: 4-digit PIN security lock with offline-first data storage and JSON backup/restore.

---

## 🏗️ Tech Stack & Architecture

- **Language**: 100% Kotlin
- **UI Framework**: Jetpack Compose + Material Design 3 (M3)
- **Architecture**: MVVM (Model-View-ViewModel) + StateFlow reactive architecture
- **Build System**: Gradle (Kotlin DSL `.gradle.kts`)
- **Min SDK**: API 26 (Android 8.0 Oreo)
- **Target SDK**: API 35 (Android 15)

---

## 🚀 Building & Running

### Prerequisites
- Android Studio Ladybug / Koala or newer
- JDK 17+
- Android SDK Platform 35

### Build via Gradle
```bash
# Build Debug APK
./gradlew assembleDebug

# Run Unit Tests
./gradlew testDebugUnitTest
```

The compiled APK will be generated at:
`app/build/outputs/apk/debug/app-debug.apk`

---

## 📄 License
Designed & Developed for Pakistani Retailers & Small Businesses.
