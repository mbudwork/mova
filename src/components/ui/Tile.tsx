import Link from 'next/link';

export function Tile({
  href,
  title,
  hint,
  glyph,
}: {
  href: string;
  title: string;
  hint: string;
  glyph: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[76px] items-center gap-4 rounded-[14px] bg-paper px-4 py-3 active:bg-concrete-deep"
    >
      <span aria-hidden className="text-2xl">
        {glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold leading-tight">{title}</span>
        <span className="block truncate text-sm text-slate">{hint}</span>
      </span>
      <span aria-hidden className="text-xl text-slate">
        ›
      </span>
    </Link>
  );
}
