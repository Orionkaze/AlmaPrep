// Renders a JSON-LD structured-data block. Server component — safe to drop into
// any server page. Pass a schema.org object (built via the helpers in lib/seo).
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
