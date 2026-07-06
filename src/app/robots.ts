import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/dealer/", "/api/", "/login/"],
    },
    sitemap: "https://topdignus.co.kr/sitemap.xml",
  };
}
