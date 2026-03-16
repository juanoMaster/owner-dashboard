const fs = require("fs");

// === BOOKINGS: cambiar reason segun metodo de pago ===
let b = fs.readFileSync("app/api/bookings/route.ts", "utf8");

b = b.replace(
  'const { cabin_id, check_in, check_out, guests, nights, subtotal, total, deposit, tinaja_days, nombre, whatsapp } = body',
  'const { cabin_id, check_in, check_out, guests, nights, subtotal, total, deposit, tinaja_days, nombre, whatsapp, metodo_pago } = body'
);

b = b.replace(
  'reason: "system_booking"',
  'reason: metodo_pago === "tarjeta" ? "system_booking" : "transfer_pending"'
);

fs.writeFileSync("app/api/bookings/route.ts", b, "utf8");
console.log("Bookings: reason segun metodo de pago");

// === CALENDAR PAGE: colores azul/rojo/verde ===
let c = fs.readFileSync("app/calendar/page.tsx", "utf8");

c = c.replace(
  `const isBooking = e.reason === "system_booking"
      return {
        id: e.id,
        title: isBooking ? "Reserva" : "Bloqueado",
        start: e.start,
        end: endPlusOne.toISOString().split("T")[0],
        color: isBooking ? "#2e7d32" : "#c0392b",`,
  `const color = e.reason === "system_booking" ? "#2e7d32" : e.reason === "transfer_pending" ? "#c0392b" : "#2563eb"
      const title = e.reason === "system_booking" ? "Confirmada" : e.reason === "transfer_pending" ? "Pendiente pago" : "Bloqueado"
      return {
        id: e.id,
        title: title,
        start: e.start,
        end: endPlusOne.toISOString().split("T")[0],
        color: color,`
);

c = c.replace(
  `{ color: "#c0392b", label: "Bloqueado" },
          { color: "#2e7d32", label: "Reserva confirmada" },`,
  `{ color: "#2563eb", label: "Bloqueado manual" },
          { color: "#c0392b", label: "Pendiente pago (24h)" },
          { color: "#2e7d32", label: "Reserva confirmada" },`
);

fs.writeFileSync("app/calendar/page.tsx", c, "utf8");
console.log("Calendar: colores azul/rojo/verde actualizados");