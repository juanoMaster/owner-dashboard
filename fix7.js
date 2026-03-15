const fs = require("fs");
const file = "app/reservar/page.tsx";
let code = fs.readFileSync(file, "utf8");

// 1. Precio de cabana sugerida: usar PRECIOS como respaldo si viene 0
code = code.replace(
  '{suggest.cabin_name} — hasta {suggest.capacity} personas — {fmt(suggest.price)}/noche',
  '{suggest.cabin_name} — hasta {suggest.capacity} personas — {fmt(suggest.price || PRECIOS[suggest.cabin_id] || 0)}/noche'
);

// 2. Cambiar mensaje cuando todas las cabanas estan ocupadas
code = code.replace(
  `<strong>Todas las cabanas de Rukatraro estan ocupadas para esas fechas.</strong>
                  <br /><br />
                  Te recomendamos elegir otras fechas o contactar directamente a Johanna.`,
  `<strong>Todas las caba\u00f1as de Rukatraro est\u00e1n ocupadas para esas fechas.</strong>
                  <br /><br />
                  Te recomendamos elegir otras fechas. Pronto podr\u00e1s ver otras caba\u00f1as disponibles en la zona.`
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: precio sugerencia + mensaje ocupadas corregidos");