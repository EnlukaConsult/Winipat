import type { CapacitorConfig } from "@capacitor/cli";

// Winniepat is a server-rendered Next.js app (middleware, server components,
// API routes) so it cannot be statically exported into the app bundle.
// Instead the native shell loads the live site and layers native APIs on top.
//
// Point `server.url` at the environment you want the app to load:
//   prod  -> https://winipat.com
//   local -> http://192.168.x.x:3000  (your machine's LAN IP + `npm run dev`)
// Override without editing this file via CAP_SERVER_URL.
const SERVER_URL = process.env.CAP_SERVER_URL || "https://winipat.com";

const config: CapacitorConfig = {
  appId: "com.winniepat.app",
  appName: "Winniepat",
  // Fallback web root (used only if the remote server is unreachable). The app
  // normally loads SERVER_URL, so this is just an offline splash.
  webDir: "mobile/www",
  server: {
    url: SERVER_URL,
    androidScheme: "https",
    cleartext: SERVER_URL.startsWith("http://"), // allow http only for LAN dev
    // Hosts the in-app WebView may navigate to without kicking out to the
    // system browser — needed for Supabase auth, Paystack checkout, etc.
    allowNavigation: [
      "winipat.com",
      "*.winipat.com",
      "*.supabase.co",
      "*.paystack.com",
      "checkout.paystack.com",
      "*.pandascrow.io",
    ],
  },
  backgroundColor: "#0B1020",
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0B1020",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
