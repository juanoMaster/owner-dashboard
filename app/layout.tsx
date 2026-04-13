import { Analytics } from "@vercel/analytics/react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import ConditionalFooter from "./components/ConditionalFooter"

export const metadata: Metadata = {
  title: "Takai",
  description: "Reservas y panel de cabañas",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/takai-logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "Takai",
  },
}

export const viewport: Viewport = {
  themeColor: "#080808",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", background: "#0d1a12" }}>
        {children}
        <ConditionalFooter />
        <Analytics />
      </body>
    </html>
  )
}
