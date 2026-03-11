export default async function Home({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return <div>Missing token</div>;
  }

  // ✅ DESPUÉS
const res = await fetch(
  `/api/dashboard?token=${token}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const error = await res.json();
    return <div>{error.error}</div>;
  }

  const { cabins } = await res.json();

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Panel del Propietario</h1>
      <p>Sistema de Gestión de Cabañas</p>

      {cabins.map((cabin: any) => (
        <div key={cabin.id} style={{ marginTop: "30px" }}>
          <h2>{cabin.name}</h2>
          <p>Capacidad: {cabin.capacity}</p>
          <button>Ver Calendario</button>
          <button style={{ marginLeft: "10px" }}>
            Bloquear Fechas
          </button>
        </div>
      ))}
    </main>
  );
}