import { createClient } from "@supabase/supabase-js"
import AdminDashboard from "../components/AdminDashboard"
export const revalidate = 0

export default async function AdminPage({ searchParams }: { searchParams: { token?: string } }) {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken || searchParams.token !== adminToken) {
    return (
      <div style={{ background: "#09070a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#3a2a45" }}>
        Acceso no autorizado
      </div>
    )
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const [
    { data: tenants }, { data: cabins }, { data: tokens }, { data: bookings }, { data: auditRows },
  ] = await Promise.all([
    supabase.from("tenants").select("id, business_name, owner_name, owner_whatsapp, deposit_percent, active, verified, created_at, slug, dashboard_token, country, currency").order("created_at"),
    supabase.from("cabins").select("id, tenant_id, name, capacity, base_price_night, cleaning_fee, extra_person_price, extras, amenities, description, active, created_at").order("tenant_id"),
    supabase.from("dashboard_links").select("id, tenant_id, token_hash, active, created_at, last_used_at").order("created_at", { ascending: false }),
    supabase.from("bookings").select("id, tenant_id, cabin_id, check_in, check_out, nights, guests, total_amount, deposit_amount, balance_amount, commission_amount, commission_status, status, notes, created_at, deleted_at").order("created_at", { ascending: false }).limit(2000),
    supabase.from("audit_log").select("id, tenant_id, cabin_id, action, entity_type, entity_id, details, performed_by, created_at").order("created_at", { ascending: false }).limit(1000),
  ])
  const thisYear = new Date().getFullYear()
  const allBookings = (bookings || []) as any[]
  const confirmed = allBookings.filter((b: any) => b.status === "confirmed" && !b.deleted_at)
  const thisYearConfirmed = confirmed.filter((b: any) => new Date(b.created_at).getFullYear() === thisYear)
  const lastYearConfirmed = confirmed.filter((b: any) => new Date(b.created_at).getFullYear() === thisYear - 1)
  const pendingAll = allBookings.filter((b: any) => b.status === "draft" && !b.deleted_at)
  const revenueByTenant: Record<string, number> = {}
  const bookingsByTenant: Record<string, number> = {}
  const pendingByTenant: Record<string, number> = {}
  const revenueByTenantLastYear: Record<string, number> = {}
  thisYearConfirmed.forEach((b: any) => {
    revenueByTenant[b.tenant_id] = (revenueByTenant[b.tenant_id] || 0) + (b.total_amount || 0)
    bookingsByTenant[b.tenant_id] = (bookingsByTenant[b.tenant_id] || 0) + 1
  })
  lastYearConfirmed.forEach((b: any) => {
    revenueByTenantLastYear[b.tenant_id] = (revenueByTenantLastYear[b.tenant_id] || 0) + (b.total_amount || 0)
  })
  pendingAll.forEach((b: any) => {
    pendingByTenant[b.tenant_id] = (pendingByTenant[b.tenant_id] || 0) + 1
  })
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    revenue: thisYearConfirmed.filter((b: any) => new Date(b.created_at).getMonth() === i).reduce((s: number, b: any) => s + (b.total_amount || 0), 0),
  }))
  const stats = {
    totalRevenueThisYear: thisYearConfirmed.reduce((s: number, b: any) => s + (b.total_amount || 0), 0),
    totalRevenueLastYear: lastYearConfirmed.reduce((s: number, b: any) => s + (b.total_amount || 0), 0),
    totalBookingsThisYear: thisYearConfirmed.length,
    totalPendingBookings: pendingAll.length,
    pendingCommissions: confirmed.reduce((s: number, b: any) => s + (b.commission_status === "pending" ? (b.commission_amount || 0) : 0), 0),
    revenueByTenant, bookingsByTenant, pendingByTenant, revenueByTenantLastYear, monthlyRevenue, thisYear,
  }
  return (
    <AdminDashboard
      tenants={(tenants || []) as any[]}
      cabins={(cabins || []) as any[]}
      tokens={(tokens || []) as any[]}
      bookings={allBookings}
      auditRows={(auditRows || []) as any[]}
      stats={stats as any}
      adminToken={adminToken}
    />
  )
}
