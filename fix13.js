
const fs = require("fs");
const file = "app/reservar/page.tsx";
let code = fs.readFileSync(file, "utf8");

// 1. Tinaja: cambiar aviso por selector en paso 2
code = code.replace(
  `{tinajaDias === 0 && (
              <div style={s.warn}>
                <div style={s.warnTitle}>Olvidaste la tinaja?</div>
                <div style={s.warnDesc}>Rukatraro tiene una tinaja de madera calentada a lena, ideal para las noches del sur. Solo $30.000/dia — usa el boton Volver para agregarla.</div>
              </div>
            )}`,
  `{tinajaDias === 0 && (
              <div style={s.warn}>
                <div style={s.warnTitle}>{"\u00bfOlvidaste la tinaja?"}</div>
                <div style={s.warnDesc}>{"Rukatraro tiene una tinaja de madera calentada a le\u00f1a, ideal para las noches del sur. Solo $30.000/d\u00eda."}</div>
                <select style={{ width: "100%", padding: "10px 12px", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "8px", fontSize: "13px", color: "#c8d8c0", fontFamily: "sans-serif", marginTop: "10px", outline: "none" }} value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>
                  <option value={0}>Sin tinaja</option>
                  {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? "d\u00eda" : "d\u00edas"} \u2014 {fmt(n * 30000)}</option>
                  ))}
                </select>
              </div>
            )}`
);

// 2. Ortografia texto 1
code = code.replace(
  'recibiras la confirmacion de reserva en tu WhatsApp',
  'recibir\u00e1s la confirmaci\u00f3n de reserva en tu WhatsApp'
);

// 3. Ortografia texto 2
code = code.replace(
  'Al confirmar quedara registrada tu solicitud con un codigo unico. Usalo como glosa en tu transferencia.',
  'Al confirmar quedar\u00e1 registrada tu solicitud con un c\u00f3digo \u00fanico. \u00dasalo como glosa en tu transferencia.'
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: tinaja selector + ortografia corregida");