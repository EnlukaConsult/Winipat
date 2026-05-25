import type { MetadataRoute } from "next";

// Static sitemap covering public, crawlable routes only. Authenticated
// dashboard pages are intentionally excluded — they require sign-in and
// are blocked by robots.txt as well.
//
// Next.js 16 auto-serves this at /sitemap.xml.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://winipat.com";
  const now = new Date();

  return [
    { url: `${base}/`,                       lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/about`,                  lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/shipping`,               lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/returns`,                lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/faq`,                    lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/trade`,                  lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/track`,                  lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`,                lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/register`,               lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`,                  lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/terms`,            lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/legal/privacy`,          lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/legal/seller-agreement`, lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/legal/dispute-policy`,   lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
  ];
}
