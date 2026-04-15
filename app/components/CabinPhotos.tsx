"use client"

import { useState, useRef } from "react"

interface CabinPhotosProps {
  cabinId: string
  cabinName: string
  initialPhotos: string[]
}

export default function CabinPhotos({ cabinId, cabinName, initialPhotos }: CabinPhotosProps) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("cabin_id", cabinId)

    try {
      const res = await fetch("/api/cabins/photos", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Error al subir la foto")
        return
      }
      setPhotos((prev) => [...prev, json.url])
    } catch {
      setError("Error de red al subir la foto")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(url: string) {
    setError(null)
    try {
      const res = await fetch("/api/cabins/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cabin_id: cabinId, url }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Error al eliminar la foto")
        return
      }
      setPhotos((prev) => prev.filter((p) => p !== url))
    } catch {
      setError("Error de red al eliminar la foto")
    }
  }

  return (
    <div style={{ marginTop: "12px" }}>
      {photos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px", marginBottom: "10px" }}>
          {photos.map((url) => (
            <div key={url} style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
              <img
                src={url}
                alt={cabinName}
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "cover" as const,
                  borderRadius: "8px",
                  display: "block",
                  border: "1px solid #2a3e28",
                }}
              />
              <button
                onClick={() => handleDelete(url)}
                title="Eliminar foto"
                style={{
                  position: "absolute",
                  top: "3px",
                  right: "3px",
                  background: "rgba(0,0,0,0.72)",
                  border: "none",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  color: "#e8d5a3",
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                {"✕"}
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading ? (
        <div style={{ fontSize: "12px", color: "#7ab87a", padding: "4px 0" }}>{"Subiendo..."}</div>
      ) : photos.length < 8 ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "transparent",
              border: "1px solid #2a3e28",
              borderRadius: "8px",
              color: "#7ab87a",
              fontSize: "12px",
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "sans-serif",
              letterSpacing: "0.3px",
            }}
          >
            {"＋ Agregar foto"}
          </button>
        </>
      ) : null}

      {error && (
        <div style={{ fontSize: "11px", color: "#e87a7a", marginTop: "6px" }}>{error}</div>
      )}
    </div>
  )
}
