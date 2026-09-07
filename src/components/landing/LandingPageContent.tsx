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
import { Brand } from '@/components/ui/Brand';

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

      {/* ---------------------------------------------------------- HERO ---
          Тёмная секция во всю ширину с золотыми бликами — первый экран
          премиум-макета. Демонстрация (MOVA-момент) остаётся внутри героя, а
          не уезжает под сгиб: это доказательство, а не картинка телефона. */}
      <section
        id="hero"
        className="surface-dark relative overflow-hidden pb-16 pt-12"
        style={{
          background:
            'radial-gradient(ellipse 900px 560px at 22% 8%, rgba(240,180,41,.16), transparent 60%),' +
            'radial-gradient(ellipse 700px 700px at 84% 30%, rgba(240,180,41,.10), transparent 55%),' +
            'var(--color-ink)',
        }}
      >
        <div className="mx-auto w-full max-w-[560px] px-5">
          {/*
            Логотип и есть надзаголовок. Раньше здесь стоял и <Brand/>, и
            copy.heroKicker — а heroKicker равен строке 'MOVA', так что
            получалось «MOVA · MOVA» с золотой точкой между ними.
          */}
          <Brand muted />

          <h1 className="mt-4 whitespace-pre-line text-[2.4rem] font-extrabold leading-[.99] tracking-[-.035em] text-cream">
            {copy.heroTitle}
          </h1>

          <p className="h-sub mt-5">{copy.heroSub}</p>

          <div className="mt-9">
            <MovaMoment copy={copy} testHref={routes.test} variant="hero" />
          </div>

          <div className="mt-9 space-y-3">
            <CtaLink
              event="hero_test_click"
              href={routes.test}
              className="btn btn-gold btn-lg btn-block"
            >
              {copy.heroCtaPrimary} <span className="cta-arrow">→</span>
            </CtaLink>
            <a href="#kak-eto-rabotaet" className="btn btn-ghost btn-block">
              {copy.heroCtaSecondary}
            </a>
            <p className="foot-caption pt-1 text-center">{copy.heroFootnote}</p>
          </div>

          {/* Числа курса живые: приходят из getCourseScope(), а не зашиты. */}
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[.86rem] font-semibold text-mist">
            <span>
              <b className="font-extrabold text-cream tnum">{scope.phrases}</b> фраз
            </span>
            <span>
              <b className="font-extrabold text-cream tnum">{scope.lessons}</b> уроков
            </span>
            <span>
              <b className="font-extrabold text-cream tnum">{scope.vocabulary}</b> слов
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- RECOGNITION --- */}
      <section className="mx-auto mt-24 w-full max-w-[560px] px-5">
        <h2 className="h-sec">{copy.recognitionTitle}</h2>
        <ul className="mt-6 space-y-3">
          {copy.recognitionItems.map((line) => (
            <li
              key={line}
              className="notice text-lg leading-snug"
            >
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-slate">{copy.recognitionFootnote}</p>
      </section>

      {/* --------------------------------------------------- SHOWCASE --- */}
      <section id="kak-eto-rabotaet" className="mx-auto mt-24 w-full max-w-[560px] px-5">
        <h2 className="h-sec">{copy.showcaseTitle}</h2>
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
          className="btn btn-ghost btn-block mt-4 bg-paper"
        >
          {copy.showcaseCta}
        </CtaLink>
      </section>

      {/* ---------------------------------------------- VS TRANSLATOR --- */}
      <section className="mx-auto mt-24 w-full max-w-[560px] px-5">
        <h2 className="h-sec">{copy.translatorTitle}</h2>
        <div className="mt-6 space-y-3">
          <div className="card p-5">
            <p className="eyebrow">{copy.translatorTranslatorLabel}</p>
            <p className="mt-2 leading-snug">{copy.translatorTranslatorText}</p>
          </div>
          <div className="notice notice-gold">
            <p className="eyebrow">{copy.translatorMovaLabel}</p>
            <p className="mt-2 font-bold leading-snug">{copy.translatorMovaText}</p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- BEFORE/AFTER - */}
      <section className="mx-auto mt-24 w-full max-w-[560px] px-5">
        <h2 className="h-sec">{copy.beforeAfterTitle}</h2>

        <div className="mt-6 card p-6">
          <p className="eyebrow">MOVA</p>
          <p className="mt-2 text-xl font-bold leading-tight">{copy.beforeAfterForeman}</p>
        </div>

        <div className="mt-3 rounded-[18px] border-l-8 border-bad bg-paper p-5">
          <p className="eyebrow">{copy.beforeLabel}</p>
          <p className="mt-2 text-lg leading-snug">{copy.beforeText}</p>
        </div>

        <div className="mt-3 rounded-[18px] border-l-8 border-good bg-paper p-5">
          <p className="eyebrow">{copy.afterLabel}</p>
          <p className="mt-2 text-lg font-bold leading-snug">{copy.afterText}</p>
        </div>

        <p className="mt-6 text-slate">{copy.beforeAfterFootnote}</p>
      </section>

      {/* -------------------------------------------------------- VIDEO --- */}
      <section className="mx-auto mt-24 w-full max-w-[560px] px-5">
        <h2 className="h-sec">{copy.videoTitle}</h2>
        <div className="mt-6">
          <VideoBlock pendingLabel={copy.videoPending} pendingSub={copy.videoPendingSub} />
        </div>
      </section>

      {/* -------------------------------------------------------- SCOPE --- */}
      <section className="mx-auto mt-24 w-full max-w-[560px] px-5">
        <h2 className="h-sec">{copy.scopeTitle}</h2>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          {[
            { value: scope.lessons, label: copy.scopeLessons },
            { value: scope.phrases, label: copy.scopePhrases },
            { value: scope.vocabulary, label: copy.scopeVocab },
          ].map((item) => (
            <div key={item.label} className="card-dark p-5 text-center">
              <dt className="tnum text-[2rem] font-extrabold leading-none text-gold-2">
                {item.value}
              </dt>
              <dd className="mt-2 text-sm leading-tight text-mist">{item.label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-slate">{copy.scopeFootnote}</p>
      </section>

      {/* ------------------------------------------------------ OFFER --- */}
      <section id="dostup" className="mx-auto mt-24 w-full max-w-[560px] px-5">
        <SectionTracker event="offer_viewed" id="dostup" />
        <h2 className="h-sec">{copy.offerTitle}</h2>
        <div className="mt-6">
          <OfferSection copy={copy} checkoutHref={routes.checkout} />
        </div>
      </section>

      {/* ----------------------------------------------------------- FAQ -- */}
      <section className="mx-auto mt-24 w-full max-w-[560px] px-5">
        <h2 className="h-sec">{copy.faqTitle}</h2>
        <div className="mt-6 space-y-3">
          {copy.faq.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- FINAL CTA --- */}
      <section className="mx-auto mt-24 w-full max-w-[560px] px-5">
        <div
          className="surface-dark relative overflow-hidden rounded-[32px] p-8"
          style={{
            background:
              'radial-gradient(circle 320px at 85% 0%, rgba(240,180,41,.22), transparent 70%),' +
              'linear-gradient(165deg,#1c1e23,var(--color-ink) 65%)',
            border: '1px solid rgba(240,180,41,.4)',
          }}
        >
          <h2 className="h-sec">{copy.finalTitle}</h2>
          <p className="body-copy mt-3">{copy.finalSub}</p>
          <CtaLink
            event="hero_test_click"
            properties={{ placement: 'final' }}
            href={routes.test}
            className="btn btn-gold btn-lg btn-block mt-7"
          >
            {copy.finalCta} <span className="cta-arrow">→</span>
          </CtaLink>
        </div>

        <footer className="mt-10 space-y-4 text-sm text-slate">
          <p>{copy.footerDisclaimer}</p>
          {!copy.reviewed ? (
            <p className="rounded-[10px] border border-cream-deep bg-paper px-3 py-2">
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
            <a href="/login" className="font-bold text-gold-deep underline">
              {copy.footerLogin}
            </a>
          </p>
        </footer>
      </section>

      <StickyCta copy={copy} testHref={routes.test} checkoutHref={routes.checkout} />
    </main>
  );
}


