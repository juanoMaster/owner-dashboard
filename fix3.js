const fs = require("fs");
const file = "app/reservar/page.tsx";
let code = fs.readFileSync(file, "utf8");

// Replace the nav section to add a "Volver" link to /inicio on paso 1
code = code.replace(
  `{paso > 1 && paso < 4 && (
          <button style={s.backBtn} onClick={() => { setSubmitError(""); setPaso(p => p - 1) }}>Volver</button>
        )}`,
  `{paso === 1 && (
          <a href="/inicio" style={{ ...s.backBtn, textDecoration: "none" }}>&#8592; Volver</a>
        )}
        {paso > 1 && paso < 4 && (
          <button style={s.backBtn} onClick={() => { setSubmitError(""); setPaso(p => p - 1) }}>Volver</button>
        )}`
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: boton Volver a /inicio agregado en paso 1 de /reservar");
