// JsonLd — inyecta structured data como <script type="application/ld+json">.
//
// NOTA sobre dangerouslySetInnerHTML: el guardrail del proyecto prohíbe
// dangerouslySetInnerHTML para HTML de usuario (anti-XSS en emails). Este es la
// ÚNICA excepción sancionada: es el patrón estándar de Next.js/Google para
// JSON-LD. Es seguro porque el payload es data PROPIA serializada con
// JSON.stringify (nunca HTML crudo) y escapamos "<" → "<" para impedir
// cualquier ruptura de <script>. No se interpola HTML de usuario.

export default function JsonLd({ data }: { data: Record<string, any> | Array<Record<string, any>> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c")
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
