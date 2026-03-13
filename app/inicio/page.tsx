"use client"
import { Suspense } from "react"

function InicioInner() {
  return (
    <div>
      <h1>Rukatraro</h1>
      <p>Cabanas en Licanray</p>
    </div>
  )
}

export default function InicioPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <InicioInner />
    </Suspense>
  )
}