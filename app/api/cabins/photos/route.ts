export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url: RequestInfo | URL, options: RequestInit = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const cabin_id = formData.get("cabin_id") as string | null

    if (!file || !cabin_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
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
      .single()

    if (selectError) {
      return NextResponse.json({ error: "Error al leer cabaña" }, { status: 500 })
    }

    const currentPhotos: string[] = cabin.photos ?? []

    const { error: updateError } = await supabase
      .from("cabins")
      .update({ photos: [...currentPhotos, publicUrl] })
      .eq("id", cabin_id)

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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url: RequestInfo | URL, options: RequestInit = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  try {
    const { cabin_id, url } = (await req.json()) as { cabin_id: string; url: string }

    if (!cabin_id || !url) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const marker = "/cabin-photos/"
    const markerIdx = url.indexOf(marker)
    if (markerIdx === -1) {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 })
    }
    const filePath = url.slice(markerIdx + marker.length)

    const { error: removeError } = await supabase.storage
      .from("cabin-photos")
      .remove([filePath])

    if (removeError) {
      return NextResponse.json({ error: "Error al eliminar archivo: " + removeError.message }, { status: 500 })
    }

    const { data: cabin, error: selectError } = await supabase
      .from("cabins")
      .select("photos")
      .eq("id", cabin_id)
      .single()

    if (selectError) {
      return NextResponse.json({ error: "Error al leer cabaña" }, { status: 500 })
    }

    const currentPhotos: string[] = cabin.photos ?? []

    const { error: updateError } = await supabase
      .from("cabins")
      .update({ photos: currentPhotos.filter((p) => p !== url) })
      .eq("id", cabin_id)

    if (updateError) {
      return NextResponse.json({ error: "Error al actualizar fotos: " + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown"
    return NextResponse.json({ error: "Error inesperado: " + message }, { status: 500 })
  }
}
