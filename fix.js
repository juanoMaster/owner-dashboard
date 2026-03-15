const fs = require("fs");
const file = "app/reservar/page.tsx";

let code = fs.readFileSync(file, "utf8");

code = code
  .replaceAll('textAlign: "center"',      'textAlign: "center" as const')
  .replaceAll('textAlign: "left"',         'textAlign: "left" as const')
  .replaceAll('textAlign: "right"',        'textAlign: "right" as const')
  .replaceAll('textTransform: "uppercase"','textTransform: "uppercase" as const')
  .replaceAll('textTransform: "capitalize"','textTransform: "capitalize" as const');

fs.writeFileSync(file, code, "utf8");
console.log("✅ Listo — se aplicaron los as const en", file);