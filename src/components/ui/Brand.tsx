/**
 * Логотип из лендинга: четыре золотых столбика эквалайзера и слово. Столбики
 * разной высоты — это уровень звука, а не украшение: продукт про то, что
 * человек слышит.
 */
export function Brand({ muted = false }: { muted?: boolean }) {
  return (
    <span className="brand">
      <span aria-hidden className="brand-mark">
        <i style={{ height: 8 }} />
        <i style={{ height: 16 }} />
        <i style={{ height: 11 }} />
        <i style={{ height: 18 }} />
      </span>
      <span
        className="brand-wordmark"
        style={
          muted
            ? { fontSize: '1rem', letterSpacing: '.16em', color: 'var(--color-mist)' }
            : undefined
        }
      >
        MOVA
      </span>
    </span>
  );
}
