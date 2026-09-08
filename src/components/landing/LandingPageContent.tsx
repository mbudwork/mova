import Link from "next/link";
import { CtaLink } from "@/components/landing/CtaLink";
import { MovaMoment } from "@/components/landing/MovaMoment";
import { StickyCta } from "@/components/landing/StickyCta";
import {
  SectionTracker,
  ViewTracker,
} from "@/components/landing/LandingTracker";
import { LocaleInit } from "@/components/landing/LocaleInit";
import { FaqItem } from "@/components/landing/FaqItem";
import { Brand } from "@/components/ui/Brand";
import { LANDING_COPY } from "@/lib/landing-copy";
import { LANDING_SECTIONS } from "@/lib/landing-sections";
import { landingRoutes } from "@/lib/landing-routes";
import type { Locale } from "@/lib/locale";
import { getCourseScope } from "@/lib/content/scope";
import { getDemoPhrase } from "@/lib/content/public-demo";
import { PRODUCT } from "@/lib/pricing";

/**
 * Лендинг, собранный по макету mova-landing-v4-premium-preview.html.
 *
 * Порядок секций и их содержание взяты оттуда: потеря смысла → путь →
 * повторение → результат → объём → цена → вопросы → финальный призыв.
 * Прошлая версия несла новые цвета поверх старой композиции, из-за чего
 * выглядела прежней.
 *
 * Демо «Что сказал прораб?» теперь ровно одно — внутри телефона в шапке.
 * Раньше тот же компонент рисовался ещё раз ниже, в разделе «как это
 * работает»; со случайными фразами дубль стал очевиден: два одинаковых
 * заголовка с разными командами.
 *
 * /ru и /uk — один макет, прочитанный дважды: меняются тексты и адреса,
 * структура нет.
 */
export async function LandingPageContent({ locale }: { locale: Locale }) {
  const copy = LANDING_COPY[locale];
  const t = LANDING_SECTIONS[locale];
  const routes = landingRoutes(locale);
  const [scope, demo] = await Promise.all([
    getCourseScope(),
    getDemoPhrase(locale),
  ]);

  const coreCount = 232;
  const profCount = 51;

  return (
    <main>
      <LocaleInit locale={locale} />
      <ViewTracker event="landing_view" />

      {/* -------------------------------------------------------- TOPBAR --- */}
      <nav className="topbar">
        <div className="wrap flex items-center justify-between">
          <Brand />
          <CtaLink
            event="hero_test_click"
            href={routes.test}
            className="btn btn-gold nav-cta"
          >
            {t.navCta}
          </CtaLink>
        </div>
      </nav>

      {/* ---------------------------------------------------------- HERO --- */}
      <section
        id="hero"
        className="surface-dark overflow-hidden pb-16 pt-[132px]"
        style={{
          background:
            "radial-gradient(ellipse 900px 560px at 22% 8%, rgba(240,180,41,.16), transparent 60%)," +
            "radial-gradient(ellipse 700px 700px at 84% 30%, rgba(240,180,41,.10), transparent 55%)," +
            "var(--color-ink)",
        }}
      >
        <div className="wrap narrow">
          <p className="eyebrow">{copy.heroKicker}</p>

          <h1 className="h-hero mt-4 whitespace-pre-line text-cream">
            {copy.heroTitle}
          </h1>

          <p className="h-sub mt-5">{copy.heroSub}</p>

          <div className="mt-8">
            <CtaLink
              event="hero_test_click"
              href={routes.test}
              className="btn btn-gold btn-lg"
            >
              {copy.heroCtaPrimary} <span className="cta-arrow">→</span>
            </CtaLink>
          </div>

          <p className="foot-caption mt-4">{copy.heroFootnote}</p>

          {/* Числа живые: приходят из getCourseScope(), а не зашиты в макет. */}
          <div className="hero-proof">
            <span>
              <b className="tnum">{scope.phrases}+</b> фраз
            </span>
            <span>
              <b className="tnum">{coreCount}</b> CORE
            </span>
            <span>
              <b className="tnum">{scope.trades.length}</b> профессий
            </span>
            <span>
              <b className="tnum">{PRODUCT.price?.formatted ?? "€29"}</b> один
              раз
            </span>
          </div>

          {/* Телефон с живым демо — единственное место, где оно есть. */}
          {demo ? (
            <div className="relative mt-14 flex justify-center">
              <span aria-hidden className="glow-blob" />
              <div className="device w-full max-w-[320px]">
                <div className="device-screen">
                  <span aria-hidden className="device-notch" />
                  <MovaMoment
                    copy={copy}
                    testHref={routes.test}
                    demo={demo}
                    variant="hero"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------ ПОТЕРЯ СМЫСЛА --- */}
      <section className="py-24">
        <div className="wrap narrow">
          <p className="eyebrow">{t.lossEyebrow}</p>
          <h2 className="h-sec mt-4">{t.lossTitle}</h2>

          <div className="bubble mt-9">
            <span className="fade">„ … </span>
            <b>{t.lossBubbleKnown1}</b>
            <span className="fade"> … </span>
            <b>{t.lossBubbleKnown2}</b>
            <span className="fade"> … “</span>
          </div>
          <p className="mt-3 text-sm text-slate">{t.lossBubbleCaption}</p>

          <div className="decomp mt-6">
            {t.lossDecomp.map((cell) => (
              <div key={cell.label} className="cell">
                <span>{cell.label}</span>
                <b>{cell.word}</b>
              </div>
            ))}
          </div>

          <p className="body-copy mt-6">{t.lossNote}</p>
        </div>
      </section>

      {/* ------------------------------------------------------- ТВОЙ ПУТЬ - */}
      <section className="surface-dark py-24">
        <div className="wrap narrow">
          <p className="eyebrow">{t.pathEyebrow}</p>
          <h2 className="h-sec mt-4">{t.pathTitle}</h2>
          <p className="h-sub mt-4">{t.pathSub}</p>

          <div className="pill-row -mx-6 mt-7 px-6">
            {t.pathProfessions.map((name, i) => (
              <span
                key={name}
                className={`pill ${i === 0 ? "pill-active" : ""}`}
              >
                {name}
              </span>
            ))}
          </div>

          <div className="prof-card mt-6">
            <div className="path-num text-cream tnum">{coreCount}</div>
            <div className="text-sm text-mist">{t.pathCore}</div>
            <div className="path-plus mt-2">+</div>
            <div className="path-num text-cream tnum">{profCount}</div>
            <div className="text-sm text-mist">{t.pathProf}</div>
            <div
              aria-hidden
              className="mx-auto my-4 h-8 w-px bg-[var(--line)]"
            />
            <div className="prof-total tnum">{coreCount + profCount}</div>
            <p className="mt-2 text-sm text-mist">{t.pathTotalCaption}</p>
          </div>

          <div className="mt-8">
            <CtaLink
              event="hero_test_click"
              href={routes.test}
              className="btn btn-ghost btn-block"
            >
              {t.pathCta}
            </CtaLink>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- ПОВТОРЕНИЕ ----- */}
      <section className="py-24">
        <div className="wrap narrow">
          <p className="eyebrow">{t.repeatEyebrow}</p>
          <h2 className="h-sec mt-4">{t.repeatTitle}</h2>
          <p className="body-copy mt-4">{t.repeatSub}</p>

          <div className="mt-12 flex flex-wrap items-start justify-center">
            {t.repeatStates.map((state, i) => (
              <div key={state} className="flex items-start">
                <div className="flex w-[92px] flex-col items-center gap-3">
                  <span
                    aria-hidden
                    className={`mem-dot ${i >= t.repeatStates.length - 2 ? "mem-dot-on" : ""}`}
                  />
                  <span
                    className={`text-center text-sm font-bold ${
                      i >= t.repeatStates.length - 2 ? "text-ink" : "text-slate"
                    }`}
                  >
                    {state}
                  </span>
                </div>
                {i < t.repeatStates.length - 1 ? (
                  <span aria-hidden className="mem-connector mt-2" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- РЕЗУЛЬТАТ ---- */}
      <section className="surface-dark py-24">
        <div className="wrap narrow">
          <p className="eyebrow">{t.resultEyebrow}</p>
          <h2 className="h-sec mt-4">{t.resultTitle}</h2>

          <div className="mt-10 space-y-4">
            <div className="split-panel split-before">
              <p className="tag">{t.resultForemanTag}</p>
              <p className="txt">{t.resultForeman}</p>
            </div>
            <div className="split-panel split-before">
              <p className="tag">{t.resultBeforeTag}</p>
              <p className="txt text-mist">{t.resultBefore}</p>
            </div>
            <div className="split-panel split-after">
              <p className="tag">{t.resultAfterTag}</p>
              <p className="txt">{t.resultAfter}</p>
            </div>
          </div>

          <p className="body-copy mt-6">{t.resultNote}</p>
        </div>
      </section>

      {/* ------------------------------------------------- ЧТО ВНУТРИ ----- */}
      <section className="py-24">
        <div className="wrap narrow">
          <p className="eyebrow">{t.insideEyebrow}</p>
          <h2 className="h-sec mt-4">{t.insideTitle}</h2>

          <dl className="mt-12 grid grid-cols-2 gap-8 text-center">
            <div>
              <dt className="scope-num tnum">{scope.phrases}+</dt>
              <dd className="scope-cap">{t.insideStats[0]!.caption}</dd>
            </div>
            <div>
              <dt className="scope-num tnum">{coreCount}</dt>
              <dd className="scope-cap">{t.insideStats[1]!.caption}</dd>
            </div>
            <div>
              <dt className="scope-num tnum">{scope.trades.length}</dt>
              <dd className="scope-cap">{t.insideStats[2]!.caption}</dd>
            </div>
            <div>
              <dt className="scope-num tnum">{t.insideStats[3]!.value}</dt>
              <dd className="scope-cap">{t.insideStats[3]!.caption}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------- ЦЕНА ----- */}
      <SectionTracker event="pricing_viewed" id="price" />
      <section id="price" className="surface-dark py-24">
        <div className="wrap narrow">
          <p className="eyebrow">{t.priceEyebrow}</p>
          <h2 className="h-sec mt-4">{t.priceTitle}</h2>

          <div className="price-card mt-11">
            <p className="eyebrow">{t.priceProduct}</p>
            <p className="price-num tnum mt-4">
              {PRODUCT.price?.formatted ?? "€29"}
            </p>
            <p className="mt-2 text-sm text-mist">{t.priceNote}</p>

            <ul className="price-list">
              {t.priceList.map((line) => (
                <li key={line}>
                  <b aria-hidden>✓</b>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="relative mt-8">
              <CtaLink
                event="purchase_clicked"
                href={routes.checkout}
                className="btn btn-gold btn-lg btn-block"
              >
                {t.priceCta} <span className="cta-arrow">→</span>
              </CtaLink>
            </div>

            <p className="foot-caption relative mt-5 text-center">
              {t.priceDoubt}{" "}
              <Link
                href={routes.test}
                className="font-bold text-gold-2 underline"
              >
                {t.priceDoubtCta}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- FAQ ----- */}
      <section className="py-24">
        <div className="wrap narrow">
          <p className="eyebrow">{t.faqEyebrow}</p>
          <h2 className="h-sec mt-4">{t.faqTitle}</h2>
          <div className="mt-8">
            {copy.faq.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- ФИНАЛЬНЫЙ БЛОК ---- */}
      <section id="test" className="surface-dark py-24 pb-40">
        <div className="wrap narrow">
          <p className="eyebrow">{t.finalEyebrow}</p>
          <h2 className="h-sec mt-4">{t.finalTitle}</h2>
          <p className="h-sub mt-4">{t.finalSub}</p>

          <div className="mt-9">
            <CtaLink
              event="hero_test_click"
              properties={{ placement: "final" }}
              href={routes.test}
              className="btn btn-gold btn-lg btn-block"
            >
              {t.finalCta} <span className="cta-arrow">→</span>
            </CtaLink>
          </div>
          <p className="foot-caption mt-4 text-center">{t.finalNote}</p>
        </div>
      </section>

      {/* ------------------------------------------------------ ПОДВАЛ ---- */}
      <footer className="wrap narrow py-12">
        <p className="text-sm text-slate">{t.footerDisclaimer}</p>
        <div className="mt-5 flex flex-wrap gap-5 text-sm font-bold">
          <Link href="/legal/terms" className="text-gold-deep underline">
            {t.footerTerms}
          </Link>
          <Link href="/legal/privacy" className="text-gold-deep underline">
            {t.footerPrivacy}
          </Link>
          <Link href="/legal/contact" className="text-gold-deep underline">
            {t.footerContact}
          </Link>
          <Link href={routes.test} className="text-gold-deep underline">
            {t.footerTest}
          </Link>
        </div>
      </footer>

      <StickyCta
        copy={copy}
        testHref={routes.test}
        checkoutHref={routes.checkout}
      />
    </main>
  );
}
