\# Takai.cl — Contexto del Proyecto



\## Stack

\- Next.js 14, TypeScript, Supabase (PostgreSQL), Vercel, GitHub



\## Tenants activos

\- \*\*Rukatraro\*\* | tenant\_id: `11518e5f-6a0b-4bdc-bb6a-a1e142544579`

\- \*\*Trinidad\*\* | tenant\_id: `db307f3e-fd56-49b3-b4c5-868c7607c31e`



\## Schema Supabase (tablas y columnas clave)



\### bookings

id, tenant\_id, cabin\_id, check\_in (date), check\_out (date), guests, nights, status (draft/confirmed), subtotal\_amount, total\_amount, deposit\_percent, deposit\_amount, balance\_amount, notes (JSON string), commission\_percent, commission\_amount, commission\_status, deleted\_at, deleted\_by, created\_at



\### calendar\_blocks

id, tenant\_id, cabin\_id, start\_date (date), end\_date (date), reason (manual/transfer\_pending/system\_booking), booking\_id, created\_at



\### cabins

id, tenant\_id, name, capacity, base\_price\_night, cleaning\_fee, active, created\_at



\### tenants

id, business\_name, owner\_name, owner\_whatsapp, deposit\_percent, active, slug, dashboard\_token, created\_at



\### dashboard\_links

id, tenant\_id, token\_hash, active, created\_at, last\_used\_at



\### audit\_log

id, tenant\_id, cabin\_id, action, entity\_type, entity\_id, details (jsonb), performed\_by, created\_at



\### leads

id, nombre, cabanas, telefono, cantidad, fuente, estado, notas, created\_at



\## Reglas críticas

\- calendar\_blocks usa start\_date/end\_date, NO columna date

\- Manual bookings se guardan como status="draft", confirmar con /api/bookings/confirm

\- createClient siempre dentro de funciones, nunca a nivel módulo

\- PowerShell: usar ; no \&\& para encadenar comandos

\- CSS nunca en template literals en .tsx — usar inline styles con objetos JS

