import { CtaLink } from '@/components/landing/CtaLink';
import { MovaMoment } from '@/components/landing/MovaMoment';
import { OfferSection } from '@/components/landing/OfferSection';
import { ShowcaseSteps } from '@/components/landing/ShowcaseSteps';
import { StickyCta } from '@/components/landing/StickyCta';
import { SectionTracker, ViewTracker } from '@/components/landing/LandingTracker';
import { VideoBlock } from '@/components/landing/VideoBlock';
import { LANDING_COPY } from '@/lib/landing-copy';
import { landingRoutes } from '@/lib/landing-routes';
import type { Locale } from '@/lib/locale';
import { getCourseScope } from '@/lib/content/scope';
import { LocaleInit } from '@/components/landing/LocaleInit';
import { FaqItem } from '@/components/landing/FaqItem';

/**
 * The V2 landing, shared by /ru and /uk. Locale changes copy and routes;
 * structure, the MOVA-moment guarantee, and CTA wiring are identical — a
 * bilingual landing is not two designs, it is one design read twice.
 */
export async function LandingPageContent({ locale }: { locale: Locale }) {
  const copy = LANDING_COPY[locale];
  const routes = landingRoutes(locale);
  const scope = await getCourseScope();

  return (
    <main className="pb-24">
      <LocaleInit locale={locale} />
      <ViewTracker event="landing_view" />

      {/* ---------------------------------------------------------- HERO --- */}
      <section id="hero" className="mx-auto w-full max-w-[520px] px-5 pt-10">
        <p className="eyebrow">{copy.heroKicker}</p>

        <h1 className="mt-5 whitespace-pre-line text-[2.1rem] font-extrabold leading-[1.08] tracking-tight">
          {copy.heroTitle}
        </h1>

        <p className="mt-5 text-lg leading-snug text-slate">{copy.heroSub}</p>

        {/* The MOVA moment sits in the hero itself, not below the fold: this
            is the demonstration, not a static phone illustration. */}
        <div className="mt-8">
          <MovaMoment copy={copy} testHref={routes.test} variant="hero" />
        </div>

        <div className="mt-8 space-y-3">
          <CtaLink
            event="hero_test_click"
            href={routes.test}
            className="flex min-h-[68px] w-full items-center justify-center rounded-[14px] bg-signal px-5 text-xl font-bold text-ink shadow-[0_3px_0_var(--color-signal-deep)] active:translate-y-[2px]"
          >
            {copy.heroCtaPrimary}
          </CtaLink>
          <a
            href="#kak-eto-rabotaet"
            className="flex min-h-[52px] w-full items-center justify-center px-5 text-base font-bold text-slate underline"
          >
            {copy.heroCtaSecondary}
          </a>
          <p className="pt-1 text-center text-sm text-slate">{copy.heroFootnote}</p>
        </div>
      </section>

      {/* ------------------------------------------------- RECOGNITION --- */}
      <section className="mx-auto mt-16 w-full max-w-[520px] px-5">
        <h2 className="text-2xl font-extrabold leading-tight">{copy.recognitionTitle}</h2>
        <ul className="mt-6 space-y-3">
          {copy.recognitionItems.map((line) => (
            <li
              key={line}
              className="rounded-[14px] border-l-8 border-concrete-deep bg-paper p-4 text-lg leading-snug"
            >
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-slate">{copy.recognitionFootnote}</p>
      </section>

      {/* --------------------------------------------------- SHOWCASE --- */}
      <section id="kak-eto-rabotaet" className="mx-auto mt-16 w-full max-w-[520px] px-5">
        <h2 className="text-2xl font-extrabold leading-tight">{copy.showcaseTitle}</h2>
        <div className="mt-6">
          <ShowcaseSteps copy={copy} />
        </div>
        <div className="mt-6">
          <MovaMoment copy={copy} testHref={routes.test} variant="showcase" />
        </div>
        <CtaLink
          event="hero_test_click"
          properties={{ placement: 'showcase' }}
          href={routes.test}
          className="mt-4 flex min-h-[60px] w-full items-center justify-center rounded-[14px] border-2 border-concrete-deep bg-paper px-5 text-lg font-bold"
        >
          {copy.showcaseCta}
        </CtaLink>
      </section>

      {/* ---------------------------------------------- VS TRANSLATOR --- */}
      <section className="mx-auto mt-16 w-full max-w-[520px] px-5">
        <h2 className="text-2xl font-extrabold leading-tight">{copy.translatorTitle}</h2>
        <div className="mt-6 space-y-3">
          <div className="rounded-[14px] bg-paper p-4">
            <p className="eyebrow">{copy.translatorTranslatorLabel}</p>
            <p className="mt-2 leading-snug">{copy.translatorTranslatorText}</p>
          </div>
          <div className="rounded-[14px] border-l-8 border-signal bg-paper p-4">
            <p className="eyebrow">{copy.translatorMovaLabel}</p>
            <p className="mt-2 font-bold leading-snug">{copy.translatorMovaText}</p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- BEFORE/AFTER - */}
      <section className="mx-auto mt-16 w-full max-w-[520px] px-5">
        <h2 className="text-2xl font-extrabold leading-tight">{copy.beforeAfterTitle}</h2>

        <div className="mt-6 rounded-[14px] bg-paper p-5">
          <p className="eyebrow">MOVA</p>
          <p className="mt-2 text-xl font-bold leading-tight">{copy.beforeAfterForeman}</p>
        </div>

        <div className="mt-3 rounded-[14px] border-l-8 border-rot bg-paper p-5">
          <p className="eyebrow">{copy.beforeLabel}</p>
          <p className="mt-2 text-lg leading-snug">{copy.beforeText}</p>
        </div>

        <div className="mt-3 rounded-[14px] border-l-8 border-gruen bg-paper p-5">
          <p className="eyebrow">{copy.afterLabel}</p>
          <p className="mt-2 text-lg font-bold leading-snug">{copy.afterText}</p>
        </div>

        <p className="mt-6 text-slate">{copy.beforeAfterFootnote}</p>
      </section>

      {/* -------------------------------------------------------- VIDEO --- */}
      <section className="mx-auto mt-16 w-full max-w-[520px] px-5">
        <h2 className="text-2xl font-extrabold leading-tight">{copy.videoTitle}</h2>
        <div className="mt-6">
          <VideoBlock pendingLabel={copy.videoPending} pendingSub={copy.videoPendingSub} />
        </div>
      </section>

      {/* -------------------------------------------------------- SCOPE --- */}
      <section className="mx-auto mt-16 w-full max-w-[520px] px-5">
        <h2 className="text-2xl font-extrabold leading-tight">{copy.scopeTitle}</h2>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          {[
            { value: scope.lessons, label: copy.scopeLessons },
            { value: scope.phrases, label: copy.scopePhrases },
            { value: scope.vocabulary, label: copy.scopeVocab },
          ].map((item) => (
            <div key={item.label} className="rounded-[14px] bg-paper p-4 text-center">
              <dt className="text-2xl font-extrabold tabular-nums">{item.value}</dt>
              <dd className="mt-1 text-sm leading-tight text-slate">{item.label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-slate">{copy.scopeFootnote}</p>
      </section>

      {/* ------------------------------------------------------ OFFER --- */}
      <section id="dostup" className="mx-auto mt-16 w-full max-w-[520px] px-5">
        <SectionTracker event="offer_viewed" id="dostup" />
        <h2 className="text-2xl font-extrabold leading-tight">{copy.offerTitle}</h2>
        <div className="mt-6">
          <OfferSection copy={copy} checkoutHref={routes.checkout} />
        </div>
      </section>

      {/* ----------------------------------------------------------- FAQ -- */}
      <section className="mx-auto mt-16 w-full max-w-[520px] px-5">
        <h2 className="text-2xl font-extrabold leading-tight">{copy.faqTitle}</h2>
        <div className="mt-6 space-y-3">
          {copy.faq.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- FINAL CTA --- */}
      <section className="mx-auto mt-16 w-full max-w-[520px] px-5">
        <div className="rounded-[14px] bg-ink p-6 text-concrete">
          <h2 className="text-2xl font-extrabold leading-tight">{copy.finalTitle}</h2>
          <p className="mt-3 opacity-80">{copy.finalSub}</p>
          <CtaLink
            event="hero_test_click"
            properties={{ placement: 'final' }}
            href={routes.test}
            className="mt-6 flex min-h-[68px] w-full items-center justify-center rounded-[14px] bg-signal px-5 text-xl font-bold text-ink"
          >
            {copy.finalCta}
          </CtaLink>
        </div>

        <footer className="mt-10 space-y-4 text-sm text-slate">
          <p>{copy.footerDisclaimer}</p>
          {!copy.reviewed ? (
            <p className="rounded-[10px] border border-concrete-deep bg-paper px-3 py-2">
              Український переклад — чернетка, ще не перевірена носієм мови.
            </p>
          ) : null}
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <a href="/legal/terms" className="underline">
              Условия
            </a>
            <a href="/legal/privacy" className="underline">
              Конфиденциальность
            </a>
            <a href="/legal/cookies" className="underline">
              Cookie
            </a>
            <a href="/legal/contact" className="underline">
              Контакты
            </a>
          </nav>
          <p>
            {locale === 'ru' ? 'Уже есть доступ?' : 'Вже є доступ?'}{' '}
            <a href="/login" className="font-bold text-blau underline">
              {copy.footerLogin}
            </a>
          </p>
        </footer>
      </section>

      <StickyCta copy={copy} testHref={routes.test} checkoutHref={routes.checkout} />
    </main>
  );
}


