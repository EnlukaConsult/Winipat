import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/chat/chat-widget";
import { CookieBanner } from "@/components/ui/cookie-banner";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Winipat - Trust-First Commerce for Nigeria",
    template: "%s | Winipat",
  },
  description:
    "Trust what you buy. Track how it moves. Pay with confidence. Winipat connects buyers, verified sellers, and logistics partners through escrow-backed payments.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Winipat",
  },
  openGraph: {
    title: "Winipat - Trust-First Commerce for Nigeria",
    description:
      "Trust what you buy. Track how it moves. Pay with confidence.",
    url: "https://winipat.com",
    siteName: "Winipat",
    type: "website",
    locale: "en_NG",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Winipat — Trust-first commerce for Nigeria",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Winipat - Trust-First Commerce",
    description:
      "Trust what you buy. Track how it moves. Pay with confidence.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Do NOT set maximumScale or userScalable=false — blocking pinch-zoom
  // is a WCAG 1.4.4 violation. Users with low vision rely on it.
  themeColor: "#3C4FE0",
  viewportFit: "cover", // lets us pad against iPhone notch with safe-area-inset
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-dvh flex flex-col antialiased">
        {/* Skip link for keyboard / screen-reader users — visually hidden
            until focused, then jumps the user past the nav to main content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-royal focus:text-white focus:rounded-md focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
        <ChatWidget />
        <CookieBanner />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

function ServiceWorkerRegistrar() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `,
      }}
    />
  );
}
