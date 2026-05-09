import type { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Reserva tu estadía",
    description: "Reserva directamente y sin comisiones.",
    openGraph: { title: "Reserva tu estadía", description: "Reserva directamente y sin comisiones.", type: "website" },
  }
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
    )
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, business_name, tagline")
      .eq("slug", params.slug)
      .maybeSingle()
    if (!tenant) return fallback
    const title = tenant.business_name || fallback.title as string
    const description = tenant.tagline || fallback.description as string
    const { data: firstCabin } = await supabase
      .from("cabins")
      .select("photos")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .not("photos", "is", null)
      .limit(1)
      .maybeSingle()
    const ogImage = firstCabin?.photos?.[0] || null
    return {
      title, description,
      openGraph: { title, description, type: "website", ...(ogImage ? { images: [{ url: ogImage }] } : {}) },
    }
  } catch {
    return fallback
  }
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
