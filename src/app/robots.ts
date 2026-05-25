import type { MetadataRoute } from "next";

// Next 16 auto-serves this at /robots.txt. We let bots crawl the
// public marketing + legal pages but block the entire authed app
// (dashboard, seller, admin, logistics) and all API routes — they
// require sign-in anyway and a Googlebot crawl would just hit 307
// redirects.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/contact", "/sellers/", "/legal/"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/seller/",
          "/admin/",
          "/logistics/",
          "/verify",
          "/forgot-password",
        ],
      },
    ],
    sitemap: "https://winipat.com/sitemap.xml",
  };
}
