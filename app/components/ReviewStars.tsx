// Muestra el promedio de reseñas aprobadas de una cabaña (Fase 9).
// Si no hay reseñas, no renderiza nada (no inventa).
export default function ReviewStars({
  summary,
  color = "#e8b84c",
  textColor = "#8a9e88",
}: {
  summary?: { count: number; average: number } | null
  color?: string
  textColor?: string
}) {
  if (!summary || summary.count < 1) return null
  const full = Math.round(summary.average)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
      <span style={{ color, fontSize: "14px", letterSpacing: "1px" }}>
        {"★".repeat(full)}{"☆".repeat(5 - full)}
      </span>
      <span style={{ color: textColor, fontSize: "12px" }}>
        {summary.average.toFixed(1)} ({summary.count})
      </span>
    </div>
  )
}
