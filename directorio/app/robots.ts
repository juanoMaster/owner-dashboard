import type { MetadataRoute } from "next"

const SITE = process.env.NEXT_PUBLIC_DIRECTORY_URL ?? "https://cabanasdelsur.cl"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
