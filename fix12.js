const fs = require("fs");
const file = "app/layout.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  'width: "16px", height: "16px"',
  'width: "26px", height: "26px"'
);

code = code.replace(
  'fontSize: "10px"',
  'fontSize: "11px"'
);

fs.writeFileSync(file, code, "utf8");
console.log("Listo: logo Takai mas grande");