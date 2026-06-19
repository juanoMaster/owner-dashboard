// Inyecta JSON-LD. dangerouslySetInnerHTML es el patrón estándar Next.js/Google
// para structured data; seguro porque es data propia con "<" escapado.
export default function JsonLd({ data }: { data: any }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c")
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
