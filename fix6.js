const fs = require("fs");
const file = "app/reservar/page.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  'gridTemplateColumns: "1fr 1fr", gap: "16px"',
  'gridTemplateColumns: "1fr 1fr", gap: "20px"'
);

code = code.replace(
  'width: "100%", padding: "12px 14px", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", fontSize: "14px"',
  'width: "100%", boxSizing: "border-box" as const, padding: "10px 8px", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", fontSize: "12px"'
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: inputs mas pequenos y centrados");