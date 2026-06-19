import type { MetadataRoute } from "next"
import { getPublishedCabins } from "../lib/data"
import { DESTINOS } from "../lib/destinos"

export const revalidate = 3600
const SITE = process.env.NEXT_PUBLIC_DIRECTORY_URL ?? "https://cabanasdelsur.cl"

// Sitemap dinámico (Fase 5): home + destinos + todas las cabañas publicables.
// Se regenera (ISR) al agregar una cabaña → onboarding self-service (Fase 10).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cabins = await getPublishedCabins()
  const now = new Date()

  const urls: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...DESTINOS.map((d) => ({
      url: `${SITE}/${d.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...cabins.map((c) => ({
      url: `${SITE}/cabana/${c.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ]
  return urls
}
