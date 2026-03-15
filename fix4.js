const fs = require("fs");
const file = "app/inicio/page.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replaceAll(
  'display: "block", width: "100%", background: "#7ab87a"',
  'display: "block", width: "100%", boxSizing: "border-box" as const, background: "#7ab87a"'
);

code = code.replaceAll('\\uD83E\\uDEB5', '\\uD83D\\uDEC1');

code = code.replace(
  `>f</span>
          Facebook`,
  `>f</span>
          @rukatraro`
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: boton centrado + tinaja + facebook corregidos");
```