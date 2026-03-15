const fs = require("fs");

// === RESERVAR: 2 columnas en PC ===
let r = fs.readFileSync("app/reservar/page.tsx", "utf8");

var pageDiv = '<div style={s.page}>';
var pageIdx = r.indexOf(pageDiv);
var afterPage = pageIdx + pageDiv.length;
var css = '\n      <style>{"@media (min-width: 768px) { .reservar-body { max-width: 820px !important; } .paso1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .paso1-grid > div:nth-child(2) { grid-column: 1; grid-row: 2; } .paso1-grid > div:nth-child(3) { grid-column: 2; grid-row: 1 / 3; align-self: start; } }"}</style>';
r = r.slice(0, afterPage) + css + r.slice(afterPage);

r = r.replace('<div style={s.body}>', '<div className="reservar-body" style={s.body}>');

var fechasIdx = r.indexOf('Fechas de estadia');
var cardBefore = r.lastIndexOf('<div style={s.card}>', fechasIdx);
r = r.slice(0, cardBefore) + '<div className="paso1-grid">\n            ' + r.slice(cardBefore);

var btnIdx = r.indexOf('form_ok ? s.btn : s.btnDisabled');
var buttonStart = r.lastIndexOf('<button', btnIdx);
r = r.slice(0, buttonStart) + '</div>\n            ' + r.slice(buttonStart);

fs.writeFileSync("app/reservar/page.tsx", r, "utf8");
console.log("Reservar: 2 columnas en PC listo");

// === LAYOUT: footer Takai.cl en todas las paginas ===
let l = fs.readFileSync("app/layout.tsx", "utf8");

var childrenStr = '{children}';
var childrenIdx = l.indexOf(childrenStr);
var afterChildren = childrenIdx + childrenStr.length;
var footer = '\n        <div style={{ textAlign: "center", padding: "10px 16px", fontSize: "9px", letterSpacing: "1px" }}><a href="https://takai.cl" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "none" }}>Creado por Takai.cl</a></div>';
l = l.slice(0, afterChildren) + footer + l.slice(afterChildren);

fs.writeFileSync("app/layout.tsx", l, "utf8");
console.log("Layout: footer Takai.cl agregado en todas las paginas");