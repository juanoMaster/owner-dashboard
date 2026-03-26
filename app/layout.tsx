export const metadata = {
  title: "Dashboard Reservas",
  description: "Panel de gestión de reservas",
  icons: { icon: "/icon.svg" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", background: "#0d1a12" }}>
        {children}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px", borderTop: "1px solid #1a2e1a" }}>
          <a href="https://takai.cl" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", opacity: 0.5 }}>
            <img src="/takai-logo.png" alt="Takai" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "3px" }} />
            <span style={{ fontSize: "10px", color: "#4a6a48", letterSpacing: "1px" }}>Creado por <strong style={{ color: "#5a7a58" }}>Takai.cl</strong></span>
          </a>
        </div>
      </body>
    </html>
  );
}
