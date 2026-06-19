import type { Metadata } from "next"
import type { ReactNode } from "react"

const SITE = process.env.NEXT_PUBLIC_DIRECTORY_URL ?? "https://cabanasdelsur.cl"

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Cabañas en el sur de Chile | Reserva directa", template: "%s | Cabañas del Sur" },
  description: "Encuentra y reserva cabañas en Licán Ray, Villarrica, Pucón y Panguipulli. Fotos reales, precios y disponibilidad al instante.",
  openGraph: { type: "website", locale: "es_CL", siteName: "Cabañas del Sur", url: SITE },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const verification = process.env.SEARCH_CONSOLE_VERIFICATION
  return (
    <html lang="es">
      <head>
        {verification ? <meta name="google-site-verification" content={verification} /> : null}
      </head>
      <body style={{ margin: 0, background: "#0d1a12", color: "#e8d5a3", fontFamily: "sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
