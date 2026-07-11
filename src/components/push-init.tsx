"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initPush } from "@/lib/push";

// Mounted in the authenticated layout. Registers the device for push on the
// native app; renders nothing and no-ops on the web.
export function PushInit() {
  const router = useRouter();
  useEffect(() => {
    initPush((url) => {
      try {
        const u = new URL(url, window.location.origin);
        router.push(u.pathname + u.search);
      } catch {
        router.push(url);
      }
    });
  }, [router]);
  return null;
}
