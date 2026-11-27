// Un subtítulo con cada frase en su propia línea: «Todo está en su sitio.» / «Lo que apuntes…».
export function Sentences({ text, className = "" }: { text: string; className?: string }) {
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
  return (
    <p className={className}>
      {sentences.map((s, i) => (
        <span key={i} className="block">
          {s}
        </span>
      ))}
    </p>
  );
}
