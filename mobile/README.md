# Winniepat mobile (Capacitor)

The App Store / Play Store build. Winniepat is a server-rendered Next.js app, so
it can't be exported into the app bundle — the native shell loads the live site
(`https://winipat.com`) in a WebView and adds native APIs (push, camera scanner,
deep links). See `capacitor.config.ts` at the repo root.

## Prerequisites

- **Both platforms:** Node 20+, `npm install` at the repo root.
- **Android:** Android Studio (JDK 21 + Android SDK).
- **iOS:** a **Mac** with Xcode + CocoaPods (`sudo gem install cocoapods`). iOS
  cannot be built on Windows.

## Accounts (to publish)

- Apple Developer Program — $99/yr — https://developer.apple.com/programs/
- Google Play Console — $25 one-time — https://play.google.com/console/

## First-time setup after a fresh clone

```bash
npm install
npx cap sync          # copies web assets + installs native deps (run pod install on Mac)
```

## Run / build

```bash
# Android — opens Android Studio; press Run to launch on a device/emulator
npm run cap:android

# iOS (Mac only) — syncs pods then opens Xcode
npm run cap:ios
```

The app loads `server.url` from `capacitor.config.ts`. To test against your
local dev server instead of production, run `npm run dev` and set the env before
opening the native IDE:

```bash
# Windows (PowerShell):  $env:CAP_SERVER_URL="http://<your-LAN-IP>:3000"
# macOS/Linux:           export CAP_SERVER_URL="http://<your-LAN-IP>:3000"
npx cap sync
```

(Use your machine's LAN IP, not `localhost` — the phone must reach your PC.)

## Native features wired

| Plugin | Purpose |
| --- | --- |
| `@capacitor/push-notifications` | Order / message push (needs APNs + FCM setup) |
| `@capacitor-mlkit/barcode-scanning` | Native camera for the product scanner |
| `@capacitor/app` | Deep links / app URL open + lifecycle |
| `@capacitor/splash-screen`, `@capacitor/status-bar` | Launch splash + status bar theming |

## Still TODO before store submission

1. **App icons & splash** — generate from the 1024px icon
   (`npx @capacitor/assets generate`).
2. **Push notifications** — create an Apple APNs key + a Firebase project (FCM),
   drop `google-services.json` (Android) and `GoogleService-Info.plist` (iOS),
   and register the device token against the Winniepat backend.
3. **Permissions strings** — add `NSCameraUsageDescription` (iOS `Info.plist`)
   and camera permission (Android manifest) for the scanner.
4. **Verify WebView flows on device** — Supabase auth cookies / OAuth redirect
   and the Paystack checkout popup are the two things most likely to need
   tweaks inside the WebView.
5. **Deep-link / universal-link config** — associate `winipat.com` so links open
   the app (Android `assetlinks.json`, iOS Associated Domains).
6. **Store listings** — screenshots, privacy policy URL, data-safety / privacy
   nutrition labels.

## Apple review note

Apple Guideline 4.2 rejects "thin web wrappers." The native features above (push,
camera scanner, deep links, biometric) are what justify the app. Payments for
**physical goods** may use Paystack (external) — Apple IAP is only required for
digital content, which Winniepat does not sell in-app.
