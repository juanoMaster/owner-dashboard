const fs = require("fs");
const file = "app/reservar/page.tsx";
let code = fs.readFileSync(file, "utf8");

// 1. Separar recuadros de fechas - mas gap
code = code.replace(
  'gridTemplateColumns: "1fr 1fr", gap: "10px"',
  'gridTemplateColumns: "1fr 1fr", gap: "16px"'
);

// 2. Agregar boton Volver al lado del boton Reservar en paso 1
code = code.replace(
  `Reservar ahora con 20% de anticipo
            </button>
          </>
        )}`,
  `Reservar ahora con 20% de anticipo
            </button>
            <a href="/inicio" style={{ display: "block", width: "100%", boxSizing: "border-box" as const, background: "transparent", color: "#8a9e88", border: "1px solid #2a3e28", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: 500, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif", marginTop: "10px", cursor: "pointer" }}>{"\u2190 Volver"}</a>
          </>
        )}`
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: fechas separadas + boton volver agregado");