# Lidex Android app (Capacitor)

This is a **real native Android shell** (APK / AAB) built with [Capacitor](https://capacitorjs.com/). The WebView loads your **deployed** Lidex Next.js site. We use a hosted URL because this repo’s Next app includes **API routes** and **dynamic pages**, which are not compatible with a full `next export` static bundle inside the APK.

## What you get

- **Package / application id:** `com.lidex.com`
- **App name:** Lidex  
- **Display:** your production Next.js URL (you configure it)

Signed **APK** and **AAB** files are produced on **your machine** (or CI) with **your** keystore. They cannot be generated inside the repo without your private signing key.

## Prerequisites

- Node 20+
- Android Studio (SDK, platform tools) — includes a JDK; Gradle needs **`JAVA_HOME`** set (on Windows, point it at Android Studio’s JBR, e.g. `C:\Program Files\Android\Android Studio\jbr`)
- A **live** HTTPS URL for the frontend (e.g. Vercel) with `NEXT_PUBLIC_BACKEND_URL` pointing at your API

## 1. Point the app at your hosted frontend

Copy the example and merge the `server` block into `frontend/capacitor.config.json`, or edit the file to add:

```json
"server": {
  "androidScheme": "https",
  "url": "https://YOUR-FRONTEND-HOST",
  "cleartext": false
}
```

Use the **exact origin** users open in the browser (no trailing slash).

Sync native projects:

```bash
cd frontend
npm install
npx cap sync android
```

Open in Android Studio:

```bash
npx cap open android
```

## 2. Debug APK (unsigned / debug keystore)

From repo root or `frontend`:

```bash
cd frontend
npm run android:assemble-debug
```

APK path:

`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

Install on a device: `adb install -r app-debug.apk`.

On **macOS/Linux**, if `gradlew.bat` fails, run from `frontend/android`:

```bash
./gradlew assembleDebug
```

## 3. Release signing (Play Store)

### Create a keystore (once)

```bash
keytool -genkey -v -keystore lidex-release.keystore -alias lidex -keyalg RSA -keysize 2048 -validity 10000
```

Keep the keystore and passwords **private**. Do not commit them.

### Configure Gradle

1. Copy `frontend/android/keystore.properties.example` to `frontend/android/keystore.properties`.
2. Fill in `storeFile` (path to your `.keystore`), passwords, and `keyAlias`.
3. `keystore.properties` is gitignored.

The example `build.gradle` reads this file when present and wires `signingConfig` for `release`.

## 4. Build release APK and AAB

```bash
cd frontend
npm run android:assemble-release
npm run android:bundle-release
```

Typical outputs:

- APK: `frontend/android/app/build/outputs/apk/release/app-release.apk`
- AAB: `frontend/android/app/build/outputs/bundle/release/app-release.aab`

Upload the **AAB** to Google Play Console.

## 5. Backend URL and cookies

The WebView must be able to call your API. Set `NEXT_PUBLIC_BACKEND_URL` on the **deployed** frontend to your public API (e.g. `https://lidex-backend-zior.onrender.com`).

Session cookies for wallet login must use attributes compatible with your setup (`SameSite`, HTTPS). If login fails only inside the app, inspect cookie and CORS settings on the API.

## 6. Optional: Firebase push (later)

Push notifications require `google-services.json`, FCM setup, and `@capacitor/push-notifications`. That is not wired in this baseline; add when you have a Firebase project.

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| White screen | `server.url` wrong or site blocks iframe/WebView; check Logcat |
| API errors | `NEXT_PUBLIC_BACKEND_URL`, CORS, HTTPS |
| `cleartext` HTTP | Only for local dev; set `cleartext: true` and use `http://10.0.2.2:3001` for emulator (not for production) |

## References

- [Capacitor Android configuration](https://capacitorjs.com/docs/android/configuration)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
