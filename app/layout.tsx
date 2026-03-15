export const metadata = {
  title: "Dashboard Reservas",
  description: "Resumen semanal de reservas"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        {children}
        <div style={{ textAlign: "center", padding: "10px 16px", fontSize: "9px", letterSpacing: "1px" }}><a href="https://takai.cl" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "none" }}>Creado por Takai.cl</a></div>
      </body>
    </html>
  );
}
