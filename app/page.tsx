export default function Home() {
  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Panel del Propietario</h1>
      <p>Sistema de Gestión de Cabañas</p>

      <div style={{ marginTop: "30px" }}>
        <h2>Cabaña Lago Azul</h2>
        <p>Estado: Disponible</p>
        <button>Ver Calendario</button>
        <button style={{ marginLeft: "10px" }}>Bloquear Fechas</button>
      </div>

      <div style={{ marginTop: "30px" }}>
        <h2>Cabaña Bosque Sur</h2>
        <p>Estado: Reservada</p>
        <button>Ver Calendario</button>
        <button style={{ marginLeft: "10px" }}>Bloquear Fechas</button>
      </div>
    </main>
  );
}
