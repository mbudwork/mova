/**
 * Zollstock — the folding rule every worker on a German site carries.
 *
 * This is the product's one progress indicator, and deliberately not a
 * percentage bar: a measuring scale belongs to the user's own world, reads at
 * a glance in sunlight, and says "you have covered this much ground" without
 * turning the home screen into a dashboard of KPIs.
 */
export function RuleProgress({
  started,
  learned,
  total,
  label,
}: {
  /** Фраз тронуто — растёт после каждого занятия. Это и рисует шкала. */
  started: number;
  /** Из них закреплено: верный ответ при повторе через день и позже. */
  learned: number;
  total: number;
  label: string;
}) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.min(started / safeTotal, 1);
  const ticks = 20;

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="text-sm font-bold tabular-nums text-slate">
          {started} / {total}
        </span>
      </div>

      <div
        role="img"
        aria-label={`Пройдено ${started} из ${total} фраз, закреплено ${learned}`}
        className="relative mt-4 h-11 overflow-hidden rounded-[10px] bg-ink-3"
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

      {/*
        Две цифры вместо одной. Шкала показывает пройденное — оно растёт в тот
        же вечер и отвечает на вопрос «я вообще двигаюсь?». Закреплённое стоит
        подписью: до него фраза доходит только при верном ответе на повторе
        через день, и делать его главным числом значило показывать ноль
        человеку, который только что без ошибок прошёл десять уроков.
      */}
      <p className="mt-3 text-sm text-slate">
        {learned > 0
          ? `Закреплено: ${learned}. Остальные вернутся на повторении.`
          : 'Закреплённых пока нет — фраза считается закреплённой после верного повтора на следующий день.'}
      </p>
    </div>
  );
}
