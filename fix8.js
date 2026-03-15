const fs = require("fs");
const file = "app/reservar/page.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  'Revisa bien tu numero de WhatsApp y correo. Ahi recibiras la confirmacion de tu reserva.',
  'Revisa bien tu n\u00famero de WhatsApp y correo. Ah\u00ed recibir\u00e1s la confirmaci\u00f3n de tu reserva.'
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: ortografia corregida");