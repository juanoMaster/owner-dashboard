const fs = require("fs")

let src = fs.readFileSync("app/trinidad/page.tsx", "utf8")

// 1. Fix Google Maps URL - more specific direct link
src = src.replace(
  'const MAP_URL = "https://www.google.com/maps/search/Caba%C3%B1as+Trinidad+Licanray/@-39.4833,-72.1500,14z"',
  'const MAP_URL = "https://www.google.com/maps/search/?api=1&query=Caba%C3%B1as+Trinidad+Licanray+Los+R%C3%ADos+Chile"'
)

// 2. Change hero text to match Rukatraro exactly
src = src.replace(
  '          <div style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "14px" }}>{"Orillas del Lago Calafqu\u00e9n"}</div>\n          <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 5vw, 48px)", fontWeight: 700, color: "#f0ede8", lineHeight: 1.15, marginBottom: "14px" }}>\n            {"El lago como"}<br/><span style={{ color: "#a8d4b8" }}>{"tu ventana"}</span>\n          </div>',
  '          <div style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "14px" }}>{"Caba\u00f1as en la naturaleza"}</div>\n          <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 5vw, 48px)", fontWeight: 700, color: "#f0ede8", lineHeight: 1.15, marginBottom: "14px" }}>\n            {"Desc\u00f3nectate en el"}<br/><span style={{ color: "#b8d8a0" }}>{"sur de Chile"}</span>\n          </div>'
)

fs.writeFileSync("app/trinidad/page.tsx", src)
console.log("✓ Trinidad page: hero texto y mapa actualizados")
