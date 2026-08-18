# ShiftKar — Android App Build Specification

## Decision: Two Paths

You have two ways to build the Android app. Both produce an APK/AAB on the Google Play Store.

| | **Capacitor Wrapper** | **Native Jetpack Compose** |
|---|---|---|
| **What it does** | Wraps the existing web app (HTML/CSS/JS) inside a native Android WebView shell | Rebuilds everything from scratch in Kotlin + Jetpack Compose |
| **Design match** | **100% identical** — it IS the same code | Pixel-perfect recreation required (manual effort) |
| **Time to build** | 1–2 hours | 2–4 weeks |
| **Performance** | Very good (modern WebView) | Best possible (true native) |
| **Offline** | Yes (service worker + assets bundled) | Yes (Room database) |
| **Push notifications** | Requires Capacitor plugin | Native Firebase |
| **File size** | ~8–12 MB | ~3–5 MB |
| **Maintenance** | One codebase (web updates auto-apply to Android) | Two codebases to maintain |

### My Recommendation

**Start with the Capacitor Wrapper.** Here's why:
- Your web app already works perfectly on Android Chrome
- The design is guaranteed identical — no pixel-pushing needed
- You get an installable APK/AAB for Google Play in under 2 hours
- The service worker already handles offline
- If you later need native features (push notifications, widgets, background services), you can add Capacitor plugins OR rebuild natively — but start with what works

---

## PATH 1: Capacitor Wrapper (Recommended)

### What is Capacitor?
Capacitor is a tool by Ionic that wraps your web app in a native Android/iOS shell. It loads your HTML/CSS/JS files from the app bundle (no server needed), gives you access to native APIs via plugins, and produces a standard APK/AAB.

### Setup Steps

#### 1. Create a new Freebuff project
Use the web project prompt (`SHIFTKAR_FULL_PROJECT.md`) to set up the web app first. Verify it works in the browser preview.

#### 2. Install Capacitor
```bash
bun add @capacitor/core @capacitor/cli @capacitor/android
npx cap init "ShiftKar" "com.seyedhosseinmousavisaeedi.shiftkar" --web-dir dist
```

#### 3. Build the web app
```bash
bun run build
```
This produces the `dist/` folder with the built web app.

#### 4. Add Android platform
```bash
npx cap add android
```

#### 5. Sync web assets to Android
```bash
npx cap sync android
```

#### 6. Configure Android (android/app/src/main/AndroidManifest.xml)
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.seyedhosseinmousavisaeedi.shiftkar">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="شیفت‌کار"
        android:supportsRtl="true"
        android:theme="@style/Theme.ShiftKar"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:launchMode="singleTask"
            android:exported="true"
            android:label="شیفت‌کار"
            android:theme="@style/Theme.ShiftKar"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
```

#### 7. Theme (android/app/src/main/res/values/styles.xml)
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.ShiftKar" parent="Theme.AppCompat.NoActionBar">
        <item name="android:statusBarColor">#0c1322</item>
        <item name="android:navigationBarColor">#0c1322</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
    </style>
</resources>
```

#### 8. Add icons
Use `scripts/generate-assets.mjs` from the web project to generate:
- `ic_launcher.png` (48×48, 72×72, 96×96, 144×144, 192×192)
- `ic_launcher_round.png` (same sizes)
- `ic_launcher_foreground.png` (432×432 adaptive icon)
- `splash_screen.png` (1080×1920)

#### 9. Build APK
```bash
cd android
./gradlew assembleDebug      # Debug APK
./gradlew assembleRelease    # Release APK (needs signing key)
```

#### 10. Build AAB for Google Play
```bash
cd android
./gradlew bundleRelease
```

### Capacitor Plugins (if needed later)
```bash
bun add @capacitor/haptics        # Vibration feedback
bun add @capacitor/share          # Native share sheet
bun add @capacitor/local-notifications  # Local push notifications
bun add @capacitor/splash-screen  # Native splash screen
bun add @capacitor/status-bar     # Status bar control
bun add @capacitor/keyboard       # Keyboard adjustments
```

### Key Advantage
When you update the web app, just run `bun run build && npx cap sync android` — the Android app gets the update on next install. One codebase, two platforms.

---

## PATH 2: Native Jetpack Compose (Full Rewrite)

### Tech Stack
- **Language:** Kotlin
- **UI:** Jetpack Compose with Material 3
- **Architecture:** MVVM + Repository pattern
- **DI:** Hilt
- **Database:** Room (replaces IndexedDB)
- **Navigation:** Compose Navigation
- **Min SDK:** 26 (Android 8.0)
- **Target SDK:** 35

### Complete Project Structure
```
app/src/main/java/ir/bipc/shiftkar/
├── ShiftKarApp.kt                    # Application class (Hilt)
├── MainActivity.kt                   # Single activity
├── navigation/
│   └── AppNavigation.kt              # NavHost with all routes
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt           # Room database
│   │   ├── NoteDao.kt               # Notes DAO
│   │   └── SettingsDataStore.kt     # DataStore for settings
│   └── model/
│       ├── ShiftType.kt             # DAY/NIGHT/REST enum
│       ├── ShiftCode.kt             # M1/M2/N1/N2/R1-R4
│       └── Note.kt                  # Note entity
├── domain/
│   ├── jalali/
│   │   ├── JalaliCalendar.kt        # Pure Jalali conversion (port of jalali.js)
│   │   ├── JalaliDate.kt            # data class JalaliDate(jy, jm, jd)
│   │   └── JalaliFormatter.kt       # Persian digits, formatting
│   ├── islamic/
│   │   └── IslamicCalendar.kt       # Hijri calendar (port of islamic-calendar.js)
│   ├── holidays/
│   │   ├── HolidayEngine.kt         # Holiday resolution (port of holidays.js)
│   │   ├── EventsData.kt            # Events dataset (port of events-data.js)
│   │   └── IrregularRules.kt        # Rule resolution
│   └── shift/
│       └── ShiftCalculator.kt       # Shift calculation (port of shift-calculator.js)
├── ui/
│   ├── theme/
│   │   ├── Color.kt                 # All color tokens
│   │   ├── Type.kt                  # Typography (IRANSansX font)
│   │   ├── Theme.kt                 # Theme composable (6 themes + dark mode)
│   │   └── Shape.kt                 # Border radii
│   ├── components/
│   │   ├── GlassCard.kt             # Glass morphism card
│   │   ├── ShiftBadge.kt            # DAY/NIGHT/REST badges
│   │   ├── MiniGroupBadge.kt        # ALL-view letter badges
│   │   ├── BottomNavBar.kt          # 4-tab bottom navigation
│   │   ├── BottomSheet.kt           # Swipe-to-dismiss sheet
│   │   ├── Toast.kt                 # Toast notifications
│   │   ├── ConfirmDialog.kt         # Confirm dialog
│   │   ├── MonthPicker.kt           # Month/year picker sheet
│   │   └── ViewPicker.kt            # Grid/table toggle
│   ├── screens/
│   │   ├── splash/
│   │   │   └── SplashScreen.kt
│   │   ├── onboarding/
│   │   │   └── OnboardingScreen.kt  # 6-slide onboarding
│   │   ├── calendar/
│   │   │   ├── CalendarScreen.kt    # Main calendar
│   │   │   ├── CalendarGrid.kt      # Grid view
│   │   │   ├── CalendarTable.kt     # Table view
│   │   │   ├── TodayBanner.kt       # Today's shift banner
│   │   │   ├── GroupFilter.kt       # Group filter chips
│   │   │   ├── TodayChip.kt         # "برو به امروز" FAB
│   │   │   └── FullscreenTable.kt   # Fullscreen table overlay
│   │   ├── daydetail/
│   │   │   └── DayDetailSheet.kt    # Day detail bottom sheet
│   │   ├── notes/
│   │   │   ├── NoteEditor.kt        # Per-day note editor
│   │   │   └── AllNotesSheet.kt     # All notes with search
│   │   ├── systems/
│   │   │   └── SystemsScreen.kt     # Corporate portals grid
│   │   ├── roster/
│   │   │   ├── RosterScreen.kt      # Roster image
│   │   │   └── RosterViewer.kt      # Full-screen zoom viewer
│   │   ├── settings/
│   │   │   └── SettingsScreen.kt    # All settings
│   │   └── tour/
│   │       ├── TourOverlay.kt       # Guided tour overlay
│   │       └── TourSteps.kt         # Tour step definitions
│   └── viewmodel/
│       ├── CalendarViewModel.kt
│       ├── SettingsViewModel.kt
│       ├── NotesViewModel.kt
│       └── TourViewModel.kt
└── util/
    ├── PreferenceKeys.kt            # DataStore keys
    └── Extensions.kt                # Kotlin extensions
```

### build.gradle.kts (app)
```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.dagger.hilt.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.seyedhosseinmousavisaeedi.shiftkar"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.seyedhosseinmousavisaeedi.shiftkar"
        minSdk = 26
        targetSdk = 35
        versionCode = 7
        versionName = "5.7.6"

        vectorDrawables { useSupportLibrary = true }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = "17" }

    buildFeatures { compose = true }

    composeOptions { kotlinCompilerExtensionVersion = "1.5.8" }

    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}

dependencies {
    // Compose BOM
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Room
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // Hilt
    implementation("com.google.dagger:hilt-android:2.50")
    ksp("com.google.dagger:hilt-android-compiler:2.50")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")

    // Accompanist (permissions, system UI)
    implementation("com.google.accompanist:accompanist-systemuicontroller:0.34.0")

    // Splash Screen API
    implementation("androidx.core:core-splashscreen:1.0.1")

    // Fonts
    implementation("io.github.radiumaeon:iransansx:1.0.0")
}
```

### Design Tokens (Kotlin)

#### Color.kt
```kotlin
package com.seyedhosseinmousavisaeedi.shiftkar.ui.theme

import androidx.compose.ui.graphics.Color

// ---- Light mode base ----
val BackgroundLight = Color(0xFFEEF3FB)
val SurfaceLight = Color(0x99FFFFFF)       // rgba(255,255,255,0.6)
val SurfaceStrongLight = Color(0xDCFFFFFF) // rgba(255,255,255,0.86)
val SurfaceSolidLight = Color.White
val TextLight = Color(0xFF1C2740)
val TextMutedLight = Color(0xFF5C6B8C)
val TextFaintLight = Color(0xFF8B98B5)
val BorderLight = Color(0xB8FFFFFF)        // rgba(255,255,255,0.72)
val BorderStrongLight = Color(0x668DA0C8)  // rgba(141,160,200,0.4)

// ---- Dark mode base ----
val BackgroundDark = Color(0xFF0C1322)
val SurfaceDark = Color(0x0DFFFFFF)        // rgba(255,255,255,0.05)
val SurfaceStrongDark = Color(0x14FFFFFF)  // rgba(255,255,255,0.08)
val SurfaceSolidDark = Color(0xFF171F37)
val TextDark = Color(0xFFE9EEFB)
val TextMutedDark = Color(0xFFA4B2CF)
val TextFaintDark = Color(0xFF6E7D9D)
val BorderDark = Color(0x14FFFFFF)         // rgba(255,255,255,0.08)
val BorderStrongDark = Color(0x24FFFFFF)   // rgba(255,255,255,0.14)

// ---- Theme palettes ----
object ThemeBlue {
    val Primary = Color(0xFF3D6BF5)
    val PrimaryStrong = Color(0xFF2F56D6)
    val PrimarySoft = Color(0xFFE7EEFF)
    val PrimaryBorder = Color(0xFFBCD0FF)
    val OnPrimary = Color.White
}

object ThemeEmerald {
    val Primary = Color(0xFF0F9D72)
    val PrimaryStrong = Color(0xFF0B7D5B)
    val PrimarySoft = Color(0xFFE2F6EE)
    val PrimaryBorder = Color(0xFFB5E6D2)
    val OnPrimary = Color.White
}

object ThemePurple {
    val Primary = Color(0xFF8B5CF6)
    val PrimaryStrong = Color(0xFF7443E0)
    val PrimarySoft = Color(0xFFF0E9FF)
    val PrimaryBorder = Color(0xFFD5C3FB)
    val OnPrimary = Color.White
}

object ThemeOrange {
    val Primary = Color(0xFFF46B16)
    val PrimaryStrong = Color(0xFFD9550A)
    val PrimarySoft = Color(0xFFFFEDE0)
    val PrimaryBorder = Color(0xFFF9CDB1)
    val OnPrimary = Color.White
}

object ThemeRose {
    val Primary = Color(0xFFF43F5E)
    val PrimaryStrong = Color(0xFFD92A4B)
    val PrimarySoft = Color(0xFFFFE9EE)
    val PrimaryBorder = Color(0xFFF9C2CD)
    val OnPrimary = Color.White
}

object ThemeTeal {
    val Primary = Color(0xFF0EA5A0)
    val PrimaryStrong = Color(0xFF0B8581)
    val PrimarySoft = Color(0xFFE0F6F4)
    val PrimaryBorder = Color(0xFFB2E5E1)
    val OnPrimary = Color.White
}

// ---- Shift status colors (consistent across all themes) ----
object ShiftColors {
    val Day = Color(0xFFC67A06)
    val DaySoft = Color(0xFFFDF2DC)
    val DayBorder = Color(0xFFF2DCAE)
    val DayInk = Color(0xFF8A5604)

    val Night = Color(0xFF4F46E5)
    val NightSoft = Color(0xFFE9EBFF)
    val NightBorder = Color(0xFFC9CFF8)
    val NightInk = Color(0xFF3832A8)

    val Rest = Color(0xFF0F9D72)
    val RestSoft = Color(0xFFE1F5ED)
    val RestBorder = Color(0xFFB8E6D4)
    val RestInk = Color(0xFF0A6D4F)

    val Holiday = Color(0xFFE11D48)
    val HolidaySoft = Color(0xFFFFE9EE)
    val HolidayBorder = Color(0xFFF7C1CD)

    val NoteBg = Color(0xFFFFF6DD)
    val NoteBorder = Color(0xFFF0DCAC)
    val NoteInk = Color(0xFF6D5310)
}
```

#### Type.kt
```kotlin
package com.seyedhosseinmousavisaeedi.shiftkar.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.seyedhosseinmousavisaeedi.shiftkar.R

val IRANSansX = FontFamily(
    Font(R.font.iransansx_regular, FontWeight.Normal),
    Font(R.font.iransansx_medium, FontWeight.Medium),
    Font(R.font.iransansx_bold, FontWeight.Bold),
    Font(R.font.iransansx_black, FontWeight.Black),
)

val ShiftKarTypography = Typography(
    displayLarge = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Black, fontSize = 30.sp, lineHeight = 42.sp),
    displayMedium = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Black, fontSize = 24.sp, lineHeight = 34.sp),
    headlineLarge = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 28.sp),
    headlineMedium = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Bold, fontSize = 17.sp, lineHeight = 24.sp),
    titleLarge = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Black, fontSize = 17.sp, lineHeight = 24.sp),
    titleMedium = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Bold, fontSize = 15.sp, lineHeight = 22.sp),
    bodyLarge = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Normal, fontSize = 15.sp, lineHeight = 26.sp),
    bodyMedium = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Normal, fontSize = 13.sp, lineHeight = 22.sp),
    bodySmall = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Normal, fontSize = 11.sp, lineHeight = 16.sp),
    labelLarge = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Bold, fontSize = 15.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Bold, fontSize = 13.sp, lineHeight = 18.sp),
    labelSmall = TextStyle(fontFamily = IRANSansX, fontWeight = FontWeight.Bold, fontSize = 11.sp, lineHeight = 14.sp),
)
```

### Domain Logic Ports

#### JalaliCalendar.kt
Port `js/domain/jalali.js` to Kotlin. The algorithm is identical:
- BREAKS array: `[-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]`
- Functions: `div`, `mod`, `jalCal`, `g2d`, `d2g`, `j2d`, `d2j`
- Public API: `toJalaali(gy,gm,gd)`, `toGregorian(jy,jm,jd)`, `isLeap(jy)`, `monthLength(jy,jm)`, `weekday(jy,jm,jd)`

#### ShiftCalculator.kt
```kotlin
package com.seyedhosseinmousavisaeedi.shiftkar.domain.shift

import com.seyedhosseinmousavisaeedi.shiftkar.domain.jalali.JalaliDate
import com.seyedhosseinmousavisaeedi.shiftkar.domain.jalali.toGregorian

enum class ShiftType { DAY, NIGHT, REST }
enum class ShiftCode(val fa: String) {
    M1("روزکار"), M2("روزکار"),
    N1("شبکار"), N2(" شبکار"),
    R1("استراحت"), R2("استراحت"), R3("استراحت"), R4("استراحت")
}

object ShiftCalculator {
    private val CYCLE = arrayOf("M1", "M2", "N1", "N2", "R1", "R2", "R3", "R4")
    private val BASE = JalaliDate(1405, 5, 4)
    private val OFFSETS = mapOf("A" to 7, "B" to 1, "C" to 5, "D" to 3)

    private fun floorMod(a: Int, n: Int): Int = ((a % n) + n) % n

    private fun daysBetweenFromBase(date: JalaliDate): Int {
        val baseG = toGregorian(BASE.jy, BASE.jm, BASE.jd)
        val targetG = toGregorian(date.jy, date.jm, date.jd)
        val baseMs = java.time.LocalDate.of(baseG.first, baseG.second, baseG.third)
            .toEpochDay() * 86_400_000L
        val targetMs = java.time.LocalDate.of(targetG.first, targetG.second, targetG.third)
            .toEpochDay() * 86_400_000L
        return ((targetMs - baseMs) / 86_400_000L).toInt()
    }

    fun getShiftCode(date: JalaliDate, group: String): String {
        val diff = daysBetweenFromBase(date)
        val idx = floorMod(diff + (OFFSETS[group] ?: 0), CYCLE.size)
        return CYCLE[idx]
    }

    fun getShiftType(code: String): ShiftType = when (code[0]) {
        'M' -> ShiftType.DAY
        'N' -> ShiftType.NIGHT
        else -> ShiftType.REST
    }

    fun calculateAllShifts(date: JalaliDate): Map<String, Pair<String, ShiftType>> {
        return OFFSETS.keys.associateWith { group ->
            val code = getShiftCode(date, group)
            code to getShiftType(code)
        }
    }
}
```

#### HolidayEngine.kt
Port `js/domain/holidays.js` to Kotlin:
- Load events from a JSON resource (events-data.json in assets/)
- RECURRING_EVENTS + IRREGULAR_EVENTS data classes
- `resolveYear(jy)` returns Map<String, List<EventResult>>
- `getDayEvents(jy,jm,jd)`, `getHoliday(jy,jm,jd)`, `isHoliday(jy,jm,jd)`
- Use the same Hijri calendar lookup table (HIJRI_MONTH_BITS as LongArray)

### UI Components (Compose)

#### GlassCard.kt
```kotlin
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    val colors = LocalShiftKarColors.current
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = colors.surface.copy(alpha = 0.78f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
        border = BorderStroke(1.dp, colors.border)
    ) {
        Column(modifier = Modifier.padding(20.dp), content = content)
    }
}
```

#### ShiftBadge.kt
```kotlin
@Composable
fun ShiftBadge(
    type: ShiftType,
    modifier: Modifier = Modifier,
    size: BadgeSize = BadgeSize.MD,
    showLabel: Boolean = true,
    group: String? = null
) {
    val colors = LocalShiftKarColors.current
    val (bg, border, ink, label) = when (type) {
        ShiftType.DAY -> listOf(ShiftColors.DaySoft, ShiftColors.DayBorder, ShiftColors.DayInk, "روزکار")
        ShiftType.NIGHT -> listOf(ShiftColors.NightSoft, ShiftColors.NightBorder, ShiftColors.NightInk, "شبکار")
        ShiftType.REST -> listOf(ShiftColors.RestSoft, ShiftColors.RestBorder, ShiftColors.RestInk, "استراحت")
    }
    val padding = when (size) { BadgeSize.SM -> 2.dp; BadgeSize.MD -> 4.dp; BadgeSize.LG -> 8.dp }
    val fontSize = when (size) { BadgeSize.SM -> 10.sp; BadgeSize.MD -> 13.sp; BadgeSize.LG -> 17.sp }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(999.dp),
        color = bg[0] as Color,
        border = BorderStroke(1.dp, bg[1] as Color)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = padding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (group != null) {
                Text(group, fontSize = fontSize * 0.85f, color = bg[2] as Color, fontWeight = FontWeight.Black)
            }
            ShiftIcon(type, modifier = Modifier.size(if (size == BadgeSize.SM) 12.dp else 16.dp))
            if (showLabel) {
                Text(label, fontSize = fontSize, color = bg[2] as Color, fontWeight = FontWeight.Bold)
            }
        }
    }
}
```

### Navigation
```kotlin
sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Onboarding : Screen("onboarding")
    object Calendar : Screen("calendar")
    object Systems : Screen("systems")
    object Roster : Screen("roster")
    object Settings : Screen("settings")
}

@Composable
fun AppNavigation(navController: NavHostController, startDestination: String) {
    NavHost(navController, startDestination) {
        composable("splash") { SplashScreen(navController) }
        composable("onboarding") { OnboardingScreen(navController) }
        composable("calendar") { CalendarScreen() }
        composable("systems") { SystemsScreen() }
        composable("roster") { RosterScreen() }
        composable("settings") { SettingsScreen(navController) }
    }
}
```

### Room Database

#### Note.kt
```kotlin
@Entity(tableName = "notes")
data class Note(
    @PrimaryKey val dateKey: String,   // "1405-05-04"
    val noteText: String,
    val updatedAt: String              // ISO 8601
)
```

#### NoteDao.kt
```kotlin
@Dao
interface NoteDao {
    @Query("SELECT * FROM notes WHERE dateKey = :dateKey")
    suspend fun get(dateKey: String): Note?

    @Query("SELECT * FROM notes ORDER BY dateKey DESC")
    suspend fun getAll(): List<Note>

    @Query("SELECT * FROM notes WHERE dateKey BETWEEN :start AND :end")
    suspend fun getForMonth(start: String, end: String): List<Note>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(note: Note)

    @Query("DELETE FROM notes WHERE dateKey = :dateKey")
    suspend fun delete(dateKey: String)
}
```

### Settings via DataStore
```kotlin
object PreferenceKeys {
    val THEME = stringPreferencesKey("theme")           // "blue"|"emerald"|...
    val THEME_MODE = stringPreferencesKey("themeMode")  // "light"|"dark"|"system"
    val MY_GROUP = stringPreferencesKey("myGroup")       // "A"|"B"|"C"|"D"|"ALL"
    val FILTER_GROUP = stringPreferencesKey("filterGroup")
    val CALENDAR_VIEW = stringPreferencesKey("calendarViewType")  // "grid"|"table"
    val ONBOARDING_COMPLETED = booleanPreferencesKey("onboardingCompleted")
    val VIEW_YEAR = intPreferencesKey("viewYear")
    val VIEW_MONTH = intPreferencesKey("viewMonth")
}
```

### Resources

#### fonts/ (place in app/src/main/res/font/)
Download IRANSansX woff2/ttf files and place as:
- `iransansx_regular.ttf`
- `iransansx_medium.ttf`
- `iransansx_bold.ttf`
- `iransansx_black.ttf`

#### assets/events.json
Copy from `scripts/vendor/events.json` (the Persian Calendar events dataset).

#### mipmap-*/ic_launcher.png
Standard Android launcher icons at all densities (mdpi through xxxhdpi).

### Gradle Version Catalog (libs.versions.toml)
```toml
[versions]
agp = "8.3.0"
kotlin = "1.9.22"
compose-bom = "2024.02.00"
room = "2.6.1"
hilt = "2.50"
navigation = "2.7.7"
datastore = "1.0.0"

[libraries]
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-icons = { group = "androidx.compose.material", name = "material-icons-extended" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
activity-compose = { group = "androidx.activity", name = "activity-compose", version = "1.8.2" }
lifecycle-viewmodel = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version = "2.7.0" }
lifecycle-runtime = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version = "2.7.0" }
navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigation" }
room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
datastore = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation = { group = "androidx.hilt", name = "hilt-navigation-compose", version = "1.1.0" }
splash-screen = { group = "androidx.core", name = "core-splashscreen", version = "1.0.1" }
accompanist = { group = "com.google.accompanist", name = "accompanist-systemuicontroller", version = "0.34.0" }
```

---

## Screens to Build (Both Paths)

### 1. Splash (۱ ثانیه)
- Centered logo (128dp), app name, English name, 3-dot loader
- After 1s: navigate to onboarding (first run) or calendar

### 2. Onboarding (۶ اسلاید)
- 4 intro slides (calendar, groups, notes, roster/systems)
- Personalization slide: group selector, theme mode, view picker (live updates)
- Install slide (skip on native — already installed)
- Horizontal swipe, prev/next/skip, page dots

### 3. Calendar (صفحه اصلی)
- **Today banner:** Glass card, date + shift icon + label
- **Nav row:** ← prev | month title (tap for picker) | notes btn + view toggle + next →
- **Group filter:** "همه" + A/B/C/D circular chips
- **Grid view:** 7-col calendar, day cells with shift badges, holidays in red
- **Table view:** Scrollable table (day, weekday, shift, occasion/note)
- **Today chip:** "برو به امروز" — expands on first leave, collapses after timeout
- **Fullscreen table:** Overlay with its own nav + scroll
- **Swipe:** RTL swipe to change month

### 4. Day Detail (bottom sheet)
- Jalali + Gregorian dates, weekday
- Holiday banner (if applicable)
- Occasions list
- Shifts for all 4 groups (highlight user's group)
- Note editor (add/view/edit/delete)

### 5. All Notes (bottom sheet)
- Search input
- List of notes with date + preview
- Tap → navigate to that date's detail

### 6. Systems (سامانه‌ها)
- 2×2 grid of corporate portal cards
- 8 portals (links open in browser)

### 7. Roster (تصویر لوحه)
- Image preview with tap to zoom
- Full-screen viewer: pinch/zoom/pan/double-tap/reset
- Color legend (red=Fridays, yellow=holidays)

### 8. Settings (تنظیمات)
- Group selector (segmented)
- Theme mode (light/dark/system)
- Theme color (6 swatches)
- View picker (grid/table)
- Help FAQ (7 items)
- About (logo, version, credits)
- Contact channels (5 links)
- Restart tour + restart onboarding

### 9. Guided Tour (۲۱ مرحله)
- Overlay with SVG mask hole + glowing ring
- Spotlight each feature with tooltip
- Tab switching, action triggers, swipe demo
- Buttons disabled until spotlight placed
- Skip/Back/Next navigation
- Frozen today chip during tour
- `markSeen()` on any exit

---

## Publishing to Google Play

### APK Signing
```bash
keytool -genkey -v -keystore shiftkar.keystore -alias shiftkar -keyalg RSA -keysize 2048 -validity 10000
```

### Build Release
```bash
# Capacitor path
cd android && ./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab

# Native path (same)
./gradlew bundleRelease
```

### Play Store Listing
- **App name:** شیفت‌کار
- **Short description:** تقویم هوشمند شیفت کاری
- **Full description:** (same as web app)
- **Category:** Business
- **Content rating:** Everyone
- **Target country:** Iran
- **Privacy policy:** Required (simple "all data stored locally" policy works)

---

## Key Differences: Android vs Web

| Feature | Web (PWA) | Android (Capacitor) | Android (Native) |
|---|---|---|---|
| Settings storage | localStorage | SharedPreferences (via WebView) | DataStore |
| Notes storage | IndexedDB | WebView IndexedDB | Room |
| Offline | Service worker | Service worker (bundled) | Built-in |
| Install prompt | beforeinstallprompt | Not needed (already native) | Not needed |
| Back button | history.back() | WebView back handling | Navigation popBackStack |
| Status bar | CSS safe-area | Capacitor StatusBar plugin | System UI controller |
| Splash | HTML/CSS animation | Native splash screen API | Native splash screen API |
| Tour overlay | CSS + JS SVG mask | Same (in WebView) | Compose Canvas + drawWithContent |
| Fonts | CSS @font-face | Same (bundled in assets) | Android font resource |
| Haptics | navigator.vibrate | Capacitor Haptics plugin | HapticFeedbackCompose |
| Share | navigator.share | Capacitor Share plugin | Intent.createChooser |

---

## My Recommendation

**Phase 1 (Now):** Use the Capacitor Wrapper path. Get the APK on Google Play within hours. The design is 100% identical because it IS the same code.

**Phase 2 (Later, if needed):** If you need native widgets, push notifications, Wear OS, or want to reduce APK size, rebuild with Jetpack Compose using the specification above. The domain logic (Jalali calendar, shift calculator, holiday engine) can be ported directly — the algorithms are identical, just different syntax.

Either way, start by creating a new Freebuff project with the web prompt (`SHIFTKAR_FULL_PROJECT.md`), then apply the Android wrapper.
