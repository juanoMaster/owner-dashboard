const fs = require("fs");
const file = "app/layout.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  '<div style={{ textAlign: "center", padding: "10px 16px", fontSize: "9px", letterSpacing: "1px" }}><a href="https://takai.cl" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "none" }}>Creado por Takai.cl</a></div>',
  '<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "12px 16px" }}><a href="https://takai.cl" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}><img src="/takai-logo.png" alt="Takai" style={{ width: "16px", height: "16px", objectFit: "contain", borderRadius: "3px" }} /><span style={{ fontSize: "10px", color: "#888", letterSpacing: "0.5px" }}>Creado por <strong style={{ color: "#aaa" }}>Takai.cl</strong></span></a></div>'
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: footer con logo Takai actualizado");