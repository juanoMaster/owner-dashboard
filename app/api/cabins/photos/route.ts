export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { getBillingInfo, isBillingBlocked } from "@/lib/billing"
import crypto from "crypto"

async function resolveToken(supabase: ReturnType<typeof getSupabaseAdmin>, token: string | null) {
  if (!token) return null
  const hash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
  const { data: link } = await supabase
    .from("dashboard_links")
    .select("tenant_id")
    .eq("token_hash", hash)
    .eq("active", true)
    .maybeSingle()
  return link?.tenant_id ?? null
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const cabin_id = formData.get("cabin_id") as string | null
    const token = formData.get("token") as string | null

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!file || !cabin_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const tenant_id = await resolveToken(supabase, token)
    if (!tenant_id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    // Verificar que la cabaña pertenece al tenant y hacer billing check
    const { data: cabinRow } = await supabase
      .from("cabins")
      .select("tenant_id")
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)
      .single()
    if (!cabinRow) return NextResponse.json({ error: "Cabaña no encontrada" }, { status: 404 })

    const billing = await getBillingInfo(tenant_id)
    if (isBillingBlocked(billing.billing_status, billing.manual_billing)) {
      return NextResponse.json(
        { error: "Tu suscripción está suspendida. Regulariza tu pago para subir fotos." },
        { status: 403 }
      )
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Solo se permiten imágenes JPEG, PNG o WEBP" }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no puede superar 5MB" }, { status: 400 })
    }

    const fileName = `${cabin_id}/${Date.now()}-${file.name}`
    const buffer = new Uint8Array(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from("cabin-photos")
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: "Error al subir: " + uploadError.message }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("cabin-photos").getPublicUrl(fileName)

    const { data: cabin, error: selectError } = await supabase
      .from("cabins")
      .select("photos")
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)
      .single()

    if (selectError) {
      return NextResponse.json({ error: "Error al leer cabaña" }, { status: 500 })
    }

    const currentPhotos: string[] = cabin.photos ?? []

    const { error: updateError } = await supabase
      .from("cabins")
      .update({ photos: [...currentPhotos, publicUrl] })
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)

    if (updateError) {
      return NextResponse.json({ error: "Error al guardar URL: " + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown"
    return NextResponse.json({ error: "Error inesperado: " + message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin()

  try {
    const { token, cabin_id, url } = (await req.json()) as { token: string; cabin_id: string; url: string }

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!cabin_id || !url) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const tenant_id = await resolveToken(supabase, token)
    if (!tenant_id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const marker = "/cabin-photos/"
    const markerIdx = url.indexOf(marker)
    if (markerIdx === -1) {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 })
    }
    const filePath = url.slice(markerIdx + marker.length)

    // Verify ownership before touching storage
    const { data: cabin, error: selectError } = await supabase
      .from("cabins")
      .select("photos")
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)
      .single()

    if (selectError || !cabin) {
      return NextResponse.json({ error: "Cabaña no encontrada" }, { status: 404 })
    }

    const currentPhotos: string[] = cabin.photos ?? []
    if (!currentPhotos.includes(url)) {
      return NextResponse.json({ error: "Foto no encontrada en esta cabaña" }, { status: 404 })
    }

    const { error: removeError } = await supabase.storage
      .from("cabin-photos")
      .remove([filePath])

    if (removeError) {
      return NextResponse.json({ error: "Error al eliminar archivo: " + removeError.message }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from("cabins")
      .update({ photos: currentPhotos.filter((p) => p !== url) })
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)

    if (updateError) {
      return NextResponse.json({ error: "Error al actualizar fotos: " + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown"
    return NextResponse.json({ error: "Error inesperado: " + message }, { status: 500 })
  }
}
