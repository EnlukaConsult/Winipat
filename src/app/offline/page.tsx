import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-midnight text-white">
      <div className="text-center px-6">
        <WifiOff className="mx-auto h-16 w-16 text-gold mb-6" />
        <h1 className="text-2xl font-bold font-[family-name:var(--font-sora)] mb-3">
          You are offline
        </h1>
        <p className="text-slate-lighter max-w-sm">
          Please check your internet connection and try again. Some previously
          visited pages may still be available.
        </p>
      </div>
    </div>
  );
}
