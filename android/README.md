# Spreadsheets Wars for Android (offline)

The **same** HTML, CSS, JS and MP3s in the repository power GitHub Pages and the Android application. The APK bundles all files from the repository root and music/; the Android WebView uses an internal HTTPS-compatible asset loader, so it works **without internet**.

## Direct APK (automatic)

Open **GitHub → Actions → Build offline Android APK** and download the `SpreadsheetsWars-Android-offline` artifact, or use the downloadable APK in the repository's **Releases** page. Any source/music changes on main rebuild the APK.

## Build in Android Studio

1. Clone the full Spreadsheets-wars repository.
2. Open the `android/` folder as an Android Studio project.
3. Build → Build APK(s), or run `gradle -p android :app:assembleDebug` with Android Gradle plugin 8.7.3, Gradle 8.9, JDK 17 and Android SDK API 35 available.
4. The Gradle task `syncOfflineAssets` automatically copies current `index.html`, scripts, CSS, icon and all available `music/*.mp3` files into the APK.

A manually installed debug APK is installable on Android 8.0+. It is not signed with a production release key; for Play Store publication use your own signing key.

## Features

- Offline J1 vs J2, J1 vs COM, modes/maps and power-ups.
- Touch joystick/arrows with per-player saved size and position.
- The built-in soundtrack plays when its MP3 files are present under `music/`. Any missing tracks are skipped.
- Add your own songs using Android's document picker. IndexedDB can persist the local music library.
- Portrait and landscape; Android Back pauses/returns in the game.

**No INTERNET permission** is declared in the APK. Online multiplayer is not included.
