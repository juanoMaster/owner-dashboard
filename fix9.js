const fs = require("fs");
const file = "app/inicio/page.tsx";
let code = fs.readFileSync(file, "utf8");

// Reducir hero en PC: menos altura SVG y menos padding en texto
code = code.replace(
  'minHeight: "380px" }} viewBox="0 0 1200 520"',
  'minHeight: "280px" }} viewBox="0 0 1200 520"'
);

code = code.replace(
  'padding: "60px 20px 20px"',
  'padding: "40px 20px 16px"'
);

// Agregar style tag con media query para PC al final, antes del ultimo </div>
code = code.replace(
  '{"Rukatraro \\u00b7 Licanray \\u00b7 Lago Calafqu\\u00e9n \\u00b7 Chile"}\n      </div>\n    </div>',
  '{"Rukatraro \\u00b7 Licanray \\u00b7 Lago Calafqu\\u00e9n \\u00b7 Chile"}\n      </div>\n      <style>{"\\\n        @media (min-width: 768px) {\\\n          svg[viewBox=\\"0 0 1200 520\\"] { max-height: 420px !important; min-height: 320px !important; }\\\n        }\\\n      "}</style>\n    </div>'
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: hero compacto en PC");