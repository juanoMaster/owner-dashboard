import type { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_name, tagline")
    .eq("slug", params.slug)
    .single()
  const title = tenant?.business_name || "Reserva tu estadía"
  const description = tenant?.tagline || "Reserva directamente y sin comisiones."
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  }
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
