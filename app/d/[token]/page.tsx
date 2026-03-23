import ManualBookingForm from "./components/ManualBookingForm"
interface Props {
  params: {
    token: string
  }
}

export default function Dashboard({ params }: Props) {
  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Panel privado</h1>
      <p>Token recibido: {params.token}</p>
      <ManualBookingForm cabins={cabins || []} tenantId={link.tenant_id} />
    </main>
  )
}
