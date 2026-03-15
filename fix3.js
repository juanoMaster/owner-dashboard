const fs = require("fs");
const file = "app/reservar/page.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  `{paso > 1 && paso < 4 && (
          <button style={s.backBtn} onClick={() => { setSubmitError(""); setPaso(p => p - 1) }}>Volver</button>
        )}`,
  `{paso === 1 && (
          <a href="/inicio" style={{ ...s.backBtn, textDecoration: "none" }}>{"\u2190 Volver"}</a>
        )}
        {paso > 1 && paso < 4 && (
          <button style={s.backBtn} onClick={() => { setSubmitError(""); setPaso(p => p - 1) }}>Volver</button>
        )}`
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: boton Volver agregado en paso 1 de /reservar");
```

**Paso 3:** En tu terminal:
```
node fix3.js
npm run build
```

Si sale verde:
```
git add .
git commit -m "fix: landing responsive + SVG mejorado + boton volver"
git push