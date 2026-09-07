/**
 * Zollstock — the folding rule every worker on a German site carries.
 *
 * This is the product's one progress indicator, and deliberately not a
 * percentage bar: a measuring scale belongs to the user's own world, reads at
 * a glance in sunlight, and says "you have covered this much ground" without
 * turning the home screen into a dashboard of KPIs.
 */
export function RuleProgress({
  learned,
  total,
  label,
}: {
  learned: number;
  total: number;
  label: string;
}) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.min(learned / safeTotal, 1);
  const ticks = 20;

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="text-sm font-bold tabular-nums text-slate">
          {learned} / {total}
        </span>
      </div>

      <div
        role="img"
        aria-label={`Освоено ${learned} из ${total} фраз`}
        className="relative mt-4 h-11 overflow-hidden rounded-[10px] bg-cream-deep"
      >
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-b from-gold-2 to-gold"
          style={{ width: `${ratio * 100}%` }}
        />
        {/* Rule markings: taller stroke every fifth tick, like a real Zollstock. */}
        <div className="absolute inset-0 flex items-end justify-between px-[3px]">
          {Array.from({ length: ticks + 1 }).map((_, i) => (
            <span
              key={i}
              className={[
                'w-px bg-ink/45',
                i % 5 === 0 ? 'h-5' : 'h-2.5',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
