export const metadata = {
  title: "Dashboard Reservas",
  description: "Resumen semanal de reservas"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        {children}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "12px 16px" }}><a href="https://takai.cl" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}><img src="/takai-logo.png" alt="Takai" style={{ width: "16px", height: "16px", objectFit: "contain", borderRadius: "3px" }} /><span style={{ fontSize: "10px", color: "#888", letterSpacing: "0.5px" }}>Creado por <strong style={{ color: "#aaa" }}>Takai.cl</strong></span></a></div>
      </body>
    </html>
  );
}
