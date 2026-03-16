const fs = require("fs");

// === FIX PRECIO: recalcular deposito en el servidor ===
let b = fs.readFileSync("app/api/bookings/route.ts", "utf8");
b = b.replace(
  'deposit_amount: deposit,',
  'deposit_amount: Math.round(total * 0.2),'
);
b = b.replace(
  'balance_amount: total - deposit,',
  'balance_amount: total - Math.round(total * 0.2),'
);
fs.writeFileSync("app/api/bookings/route.ts", b, "utf8");
console.log("API: deposito recalculado servidor");

// === PASO 2 COMPACTO EN PC ===
let r = fs.readFileSync("app/reservar/page.tsx", "utf8");

var oldStyle = '@media (min-width: 768px) { .reservar-body { max-width: 820px !important; } .paso1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .paso1-grid > div:nth-child(2) { grid-column: 1; grid-row: 2; } .paso1-grid > div:nth-child(3) { grid-column: 2; grid-row: 1 / 3; align-self: start; } }';
var newStyle = '@media (min-width: 768px) { .reservar-body { max-width: 820px !important; } .paso1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .paso1-grid > div:nth-child(2) { grid-column: 1; grid-row: 2; } .paso1-grid > div:nth-child(3) { grid-column: 2; grid-row: 1 / 3; align-self: start; } .paso2-compact .resItem { padding: 6px 0 !important; } .paso2-compact .resKey, .paso2-compact .resVal { font-size: 12px !important; } }';
r = r.replace(oldStyle, newStyle);

fs.writeFileSync("app/reservar/page.tsx", r, "utf8");
console.log("Reservar: paso 2 compacto en PC");