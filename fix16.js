const fs = require("fs");
let r = fs.readFileSync("app/reservar/page.tsx", "utf8");

var oldMedia = "@media (min-width: 768px) { .reservar-body { max-width: 820px !important; } .paso1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .paso1-grid > div:nth-child(2) { grid-column: 1; grid-row: 2; } .paso1-grid > div:nth-child(3) { grid-column: 2; grid-row: 1 / 3; align-self: start; } .paso2-compact .resItem { padding: 6px 0 !important; } .paso2-compact .resKey, .paso2-compact .resVal { font-size: 12px !important; } }";
var newMedia = "@media (min-width: 768px) { .reservar-body { max-width: 820px !important; } .paso1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .paso1-grid > div:nth-child(2) { grid-column: 1; grid-row: 2; } .paso1-grid > div:nth-child(3) { grid-column: 2; grid-row: 1 / 3; align-self: start; } .paso2-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } }";
r = r.replace(oldMedia, newMedia);

// Wrap paso 2 detail and price cards
r = r.replace(
  '{paso === 2 && (\n          <>\n            <div style={s.eye}>Resumen de tu reserva</div>\n            <div style={s.title}>{cabin_name}</div>',
  '{paso === 2 && (\n          <>\n            <div style={s.eye}>Resumen de tu reserva</div>\n            <div style={s.title}>{cabin_name}</div>'
);

fs.writeFileSync("app/reservar/page.tsx", r, "utf8");
console.log("Reservar: paso 2 grid PC");