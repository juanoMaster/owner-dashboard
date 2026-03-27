const fs = require("fs")

let src = fs.readFileSync("app/reservar/page.tsx", "utf8")

// 1. Add Trinidad cabin IDs constant after the imports
src = src.replace(
  'function ReservarInner() {',
  'const TRINIDAD_CABIN_IDS = new Set([\n  "b0fd873b-fe33-479a-b00c-908c3ac6c52d",\n  "6802b931-398e-4f38-9b08-b724a672b702",\n  "6650debc-4258-4045-9b4c-55c9352d6fcf",\n])\n\nfunction ReservarInner() {'
)

// 2. Add isTrinidad variable after cabin_id is defined
src = src.replace(
  '  const precio_noche = Number(params.get("price")) || 30000',
  '  const isTrinidad = TRINIDAD_CABIN_IDS.has(cabin_id)\n  const precio_noche = Number(params.get("price")) || 30000'
)

// 3. Hide tinaja in paso 1 (the select dropdown)
src = src.replace(
  '              <span style={s.lbl}>{"Tinaja de madera (+$30.000/d\\u00eda)"}</span>\n              <select style={s.sel} value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>\n                <option value={0}>Sin tinaja</option>\n                {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (\n                  <option key={n} value={n}>{n} {n === 1 ? "d\\u00eda" : "d\\u00edas"} {"\\u2014"} {fmt(n * 30000)}</option>\n                ))}\n              </select>',
  '              {!isTrinidad && (\n                <>\n                  <span style={s.lbl}>{"Tinaja de madera (+$30.000/d\\u00eda)"}</span>\n                  <select style={s.sel} value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>\n                    <option value={0}>Sin tinaja</option>\n                    {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (\n                      <option key={n} value={n}>{n} {n === 1 ? "d\\u00eda" : "d\\u00edas"} {"\\u2014"} {fmt(n * 30000)}</option>\n                    ))}\n                  </select>\n                </>\n              )}'
)

// 4. Hide tinaja warning in paso 2
src = src.replace(
  '            {tinajaDias === 0 && (\n              <div style={{ ...s.warn, padding: "12px", marginBottom: "12px" }}>\n                <div style={s.warnTitle}>{"\\u00bfOlvidaste la tinaja?"}</div>\n                <div style={{ ...s.warnDesc, fontSize: "11px" }}>{"Tinaja de madera calentada a le\\u00f1a. Solo $30.000/d\\u00eda."}</div>\n                <select style={{ width: "100%", padding: "8px 10px", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "8px", fontSize: "12px", color: "#c8d8c0", fontFamily: "sans-serif", marginTop: "8px", outline: "none" }} value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>\n                  <option value={0}>Sin tinaja</option>\n                  {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (\n                    <option key={n} value={n}>{n} {n === 1 ? "d\\u00eda" : "d\\u00edas"} {"\\u2014"} {fmt(n * 30000)}</option>\n                  ))}\n                </select>\n              </div>\n            )}',
  '            {tinajaDias === 0 && !isTrinidad && (\n              <div style={{ ...s.warn, padding: "12px", marginBottom: "12px" }}>\n                <div style={s.warnTitle}>{"\\u00bfOlvidaste la tinaja?"}</div>\n                <div style={{ ...s.warnDesc, fontSize: "11px" }}>{"Tinaja de madera calentada a le\\u00f1a. Solo $30.000/d\\u00eda."}</div>\n                <select style={{ width: "100%", padding: "8px 10px", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "8px", fontSize: "12px", color: "#c8d8c0", fontFamily: "sans-serif", marginTop: "8px", outline: "none" }} value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>\n                  <option value={0}>Sin tinaja</option>\n                  {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (\n                    <option key={n} value={n}>{n} {n === 1 ? "d\\u00eda" : "d\\u00edas"} {"\\u2014"} {fmt(n * 30000)}</option>\n                  ))}\n                </select>\n              </div>\n            )}'
)

// 5. Fix transfer data in paso 3 to be dynamic based on tenant
const oldTransfer = `              {metodoPago === "transferencia" && (
                <div style={s.payBody}>
                  <div style={{ ...s.priceBox, marginTop: "10px" }}>
                    {[["Banco","BancoEstado"],["Tipo","Cuenta RUT"],["N\\u00famero","15.665.466-3"],["Nombre","Rukatraro"],["Monto exacto",fmt(deposito)]].map(([k,v]) => (
                      <div key={k} style={s.priceRow}><span style={s.priceKey}>{k}</span><span style={s.priceVal}>{v}</span></div>
                    ))}
                  </div>
                  <div style={{ marginTop: "12px", fontSize: "12px", color: "#8a9e88", lineHeight: 1.6 }}>
                    {"Una vez que Rukatraro verifique tu transferencia, recibir\\u00e1s la confirmaci\\u00f3n de reserva en tu WhatsApp "}{whatsapp ? "(" + whatsapp + ")" : ""}{" y en el correo que indicaste"}{email ? " (" + email + ")" : " en el paso anterior"}.
                  </div>
                </div>
              )}`

const newTransfer = `              {metodoPago === "transferencia" && (
                <div style={s.payBody}>
                  <div style={{ ...s.priceBox, marginTop: "10px" }}>
                    {(isTrinidad
                      ? [["Banco","BancoEstado"],["Tipo","Cuenta RUT"],["N\\u00famero","15.157.523"],["Titular","Ang\\u00e9lica Ancalef"],["RUT","13.157.523-8"],["Monto exacto",fmt(deposito)]]
                      : [["Banco","BancoEstado"],["Tipo","Cuenta RUT"],["N\\u00famero","15.665.466-3"],["Nombre","Rukatraro"],["Monto exacto",fmt(deposito)]]
                    ).map(([k,v]) => (
                      <div key={k} style={s.priceRow}><span style={s.priceKey}>{k}</span><span style={s.priceVal}>{v}</span></div>
                    ))}
                  </div>
                  <div style={{ marginTop: "12px", fontSize: "12px", color: "#8a9e88", lineHeight: 1.6 }}>
                    {"Una vez que "}{isTrinidad ? "Ang\\u00e9lica" : "Rukatraro"}{"verifique tu transferencia, recibir\\u00e1s la confirmaci\\u00f3n de reserva en tu WhatsApp "}{whatsapp ? "(" + whatsapp + ")" : ""}{" y en el correo que indicaste"}{email ? " (" + email + ")" : " en el paso anterior"}.
                  </div>
                </div>
              )}`

src = src.replace(oldTransfer, newTransfer)

// 6. Fix transfer data in paso 4 (success screen) to be dynamic
const oldBank = `              <div style={s.bankTitle}>Datos para la transferencia</div>
              {[["Banco","BancoEstado"],["Cuenta RUT","15.665.466-3"],["Titular","Rukatraro"],["Monto exacto",fmt(deposito)],["Glosa / Concepto",codigo]].map(([k,v],idx,arr) => (`

const newBank = `              <div style={s.bankTitle}>Datos para la transferencia</div>
              {(isTrinidad
                ? [["Banco","BancoEstado"],["Cuenta RUT","15.157.523"],["Titular","Ang\\u00e9lica Ancalef"],["RUT Titular","13.157.523-8"],["Monto exacto",fmt(deposito)],["Glosa / Concepto",codigo]]
                : [["Banco","BancoEstado"],["Cuenta RUT","15.665.466-3"],["Titular","Rukatraro"],["Monto exacto",fmt(deposito)],["Glosa / Concepto",codigo]]
              ).map(([k,v],idx,arr) => (`

src = src.replace(oldBank, newBank)

// 7. Fix the success text "Rukatraro verifique" in paso 4
src = src.replace(
  '              {"Una vez que Rukatraro verifique tu transferencia de "}',
  '              {"Una vez que "}{isTrinidad ? "Ang\\u00e9lica" : "Rukatraro"}{"  verifique tu transferencia de "}'
)

// 8. Fix footer glosa text in paso 4
src = src.replace(
  '              {"Usa "}<strong style={{ color: "#7ab87a" }}>{codigo}</strong>{" como glosa para que Rukatraro identifique tu pago."}',
  '              {"Usa "}<strong style={{ color: "#7ab87a" }}>{codigo}</strong>{" como glosa para que "}{isTrinidad ? "Ang\\u00e9lica" : "Rukatraro"}{" identifique tu pago."}'
)

fs.writeFileSync("app/reservar/page.tsx", src)
console.log("OK - reservar page actualizado para Trinidad")

// Verify isTrinidad appears
if (src.includes("isTrinidad")) {
  console.log("OK - isTrinidad presente")
} else {
  console.error("ERROR - isTrinidad no encontrado")
}
