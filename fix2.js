const fs = require("fs");
const file = "app/reservar/page.tsx";
let code = fs.readFileSync(file, "utf8");

// Paso 1: Revertir todos los "as const" individuales del fix anterior
code = code
  .replaceAll('"center" as const',     '"center"')
  .replaceAll('"left" as const',       '"left"')
  .replaceAll('"right" as const',      '"right"')
  .replaceAll('"uppercase" as const',  '"uppercase"')
  .replaceAll('"capitalize" as const', '"capitalize"');

// Paso 2: Agregar import de CSSProperties si no existe
if (!code.includes("CSSProperties")) {
  code = code.replace(
    /(^import .+\n)+/m,
    '$&import type { CSSProperties } from "react"\n'
  );
}

// Paso 3: Tipar el objeto de estilos completo
code = code.replace(
  /const s\s*=\s*\{/,
  'const s: Record<string, CSSProperties> = {'
);

fs.writeFileSync(file, code, "utf8");
console.log("✅ Listo — objeto s tipado con Record<string, CSSProperties>");