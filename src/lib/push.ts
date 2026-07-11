// Native push-notification registration (Capacitor). No-ops on the web —
// everything is dynamically imported and guarded by isNativePlatform(), so the
// browser bundle never loads the native plugins or evaluates them during SSR.
//
// Requires FCM (Android) + APNs (iOS) to be configured in the native projects
// before tokens actually arrive; the plumbing here is ready either way.

let initialized = false;

export async function initPush(onNavigate?: (path: string) => void): Promise<void> {
  if (initialized) return;
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return; // web / not the native app
  initialized = true;

  const platform = Capacitor.getPlatform(); // "ios" | "android"
  const { PushNotifications } = await import("@capacitor/push-notifications");

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") return;

  // Send the device token to the backend once the OS issues it.
  await PushNotifications.addListener("registration", async (token) => {
    try {
      await fetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.value, platform }),
      });
    } catch {
      // best-effort; will retry on next app launch
    }
  });

  await PushNotifications.addListener("registrationError", (err) => {
    console.warn("[push] registration error", err);
  });

  // Deep-link into the app when a notification is tapped (data.url = a path).
  await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const url = action.notification.data?.url as string | undefined;
    if (url && onNavigate) onNavigate(url);
  });

  await PushNotifications.register();
}
