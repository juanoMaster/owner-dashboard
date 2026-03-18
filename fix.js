const fs = require("fs");
const path = require("path");

const [, , targetArg, sourceArg] = process.argv;

if (!targetArg || !sourceArg) {
  console.log('Uso: node fix.js "ruta/destino" "ruta/fuente"');
  process.exit(1);
}

const projectRoot = process.cwd();
const targetPath = path.resolve(projectRoot, targetArg);
const sourcePath = path.resolve(projectRoot, sourceArg);

if (!fs.existsSync(sourcePath)) {
  console.error("No existe el archivo fuente:", sourcePath);
  process.exit(1);
}

const content = fs.readFileSync(sourcePath, "utf8");

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, content, "utf8");

console.log("OK archivo actualizado:");
console.log("Destino:", path.relative(projectRoot, targetPath));
console.log("Fuente :", path.relative(projectRoot, sourcePath));