export function parseNotes(notes: unknown): Record<string, string> {
  if (!notes) return {}
  const obj: Record<string, string> | null =
    typeof notes === "object"
      ? (notes as Record<string, string>)
      : typeof notes === "string" && (notes as string).trimStart().startsWith("{")
        ? (() => { try { return JSON.parse(notes as string) } catch { return null } })()
        : null
  if (obj) return {
    nombre: obj.nombre || obj.Nombre || "",
    whatsapp: obj.whatsapp || obj.WhatsApp || "",
    codigo: obj.codigo || obj.Codigo || "",
    origen: obj.origen || obj.Origen || "",
    tinaja: obj.tinaja || obj.Tinaja || "",
    notas: obj.notas || obj.Notas || "",
    price_per_night: obj.price_per_night || "",
  }
  const result: Record<string, string> = {}
  String(notes).split("|").forEach((part) => {
    const idx = part.indexOf(":")
    if (idx > -1) {
      const key = part.slice(0, idx).trim().toLowerCase()
      const val = part.slice(idx + 1).trim()
      if (key && val) result[key] = val
    }
  })
  return result
}
