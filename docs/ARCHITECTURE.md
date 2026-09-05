# ARCHITECTURE — Deutsch auf der Baustelle

## 1. Что это за продукт (и что это меняет в архитектуре)

Тренажёр восприятия на слух, а не курс языка. Целевой навык:

```
HEAR → UNDERSTAND → REACT
```

Три следствия для архитектуры, которые определяют почти все решения ниже:

1. **Аудио — первичный контент, текст вторичен.** Значит аудио должно быть
   предсказуемо дешёвым (генерируется один раз, кэшируется, версионируется по
   checksum текста) и доступно офлайн.
2. **Фраза — не строка, а размеченная структура.** Чтобы проверять понимание
   `ACTION / OBJECT / MEASUREMENT / LOCATION / SEQUENCE`, разметка обязана быть
   отдельными строками в БД, а не парсингом на лету.
3. **Понимание ≠ память.** Значит нужен генератор *невиданных* комбинаций из
   утверждённых компонентов — и жёсткая гарантия, что он не изобретает немецкий.

## 2. Стек

| Слой | Решение |
|---|---|
| Framework | Next.js 16.x, App Router, Turbopack, React 19 |
| Язык | TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| БД / Auth / Storage | Supabase (PostgreSQL 15+, GoTrue, private bucket `audio`) |
| Авторизация | RLS в БД + server-side guards; никакой авторизации в клиенте |
| Мутации | Server Actions; REST route handlers только для webhooks и подписанных URL |
| TTS | ElevenLabs через `AudioProvider` абстракцию (`mock` \| `elevenlabs`) |
| Платежи | Stripe через `PaymentProvider` абстракцию (`mock` \| `stripe`) |
| PWA | manifest + Workbox service worker, app-shell + выборочный audio cache |
| Тесты | Vitest (unit), Testcontainers/Supabase local (integration), Playwright (E2E) |

Прямой доступ к БД из браузера разрешён **только на чтение** и только там, где
RLS уже даёт корректный срез. Всё, что влияет на деньги, доступ, оценку теста и
статус контента, идёт через сервер.

## 3. Routes

### Public
```
/                        Landing (§33)
/purchase                Оффер + checkout
/purchase/success        Возврат из Stripe
/login  /register  /auth/callback  /auth/reset
/legal/impressum  /legal/datenschutz  /legal/agb  /legal/disclaimer
```

### App (авторизован; контент требует entitlement)
```
/onboarding                        уровень → профессии → primary
/onboarding/test                   диагностический listening test
/app                               HOME (§6)
/app/learn                         текущий путь обучения
/app/lesson/[slug]                 урок: training → listening
/app/bauleiter                     «Что говорит прораб?» (§17)
/app/profession                    «Моя профессия»
/app/trainer                       аудиотренажёр / повторение (SRS)
/app/say                           «Мне нужно сказать…» (§18)
/app/say/[phraseId]/show           SHOW TO GERMAN, полноэкранно (§19)
/app/dictionary                    словарь + поиск RU↔DE
/app/favorites                     «Мои фразы»
/app/test/final                    Baustelle Listening Test (§26)
/app/profile                       профессия, язык интерфейса, прогресс
/app/offline                       офлайн-заглушка
```

### Admin (`role = admin`, проверка в БД)
```
/admin                             dashboard
/admin/phrases  /admin/phrases/[id]
/admin/vocabulary
/admin/families
/admin/templates                   шаблоны + слоты + утверждение опций
/admin/combinations                предпросмотр unseen combinations
/admin/lessons  /admin/modules  /admin/professions
/admin/audio                       generate / generate missing / approve
/admin/tests
/admin/users
/admin/analytics                   в т.ч. searches with no result
```

### API
```
POST /api/stripe/webhook           идемпотентный, raw body, verify signature
POST /api/checkout                 создание session (или mock grant)
GET  /api/audio/[assetId]/url      подписанный URL после проверки доступа
POST /api/search                   RU→DE / DE→RU + логирование пустых запросов
POST /api/test/grade               оценка на сервере, is_correct не покидает сервер
POST /api/admin/audio/generate     admin-only, ставит job в очередь
```

## 4. Карта сущностей

```
languages ──< *_translations (все локализуемые тексты)

professions ──< profession_translations
     │
     ├──< modules(scope=profession) ──< lessons ──< lesson_phrases >── phrases
     └──< vocabulary_items

modules(scope=core) ──< lessons ──< lesson_translations

phrase_families ──< phrases          (одна интенция, register_level 1..4)

phrases ──< phrase_translations      (text, pronunciation_ru, keywords[])
        ──< phrase_components        (ACTION/OBJECT/MEASUREMENT/... + offsets)
        ──< phrase_vocabulary >── vocabulary_items ──< vocabulary_translations
        ──< audio_assets >── voices

content_templates ──< template_slots ──< template_slot_options ──< *_translations
                  └──< generated_combinations ──< *_translations
                                              └──< audio_assets

tests ──< test_questions ──< test_question_options ──< *_translations
      └──< test_attempts ──< test_answers

auth.users ──1:1── profiles ──< user_professions
                            ──< entitlements ──(via)── payments
                            ──< phrase_progress   (SRS состояние)
                            ──< lesson_progress
                            ──< favorites
                            ──< search_queries    ← самое ценное для контента
                            ──< analytics_events

content_reviews  (аудит переходов статусов, entity_type + entity_id)
audio_generation_jobs
processed_webhook_events (идемпотентность Stripe)
```

### Ключевые инварианты

- `phrases.verified` — **generated column** от `verification_status = 'approved'`.
  Его физически нельзя выставить руками и рассинхронизировать.
- `safety_sensitive = true` требует `safety_approved = true` до `approved`
  (check-constraint + RLS).
- Ровно одна активная `entitlement` на `(user_id, product_code)` — partial unique index.
- Ровно одна primary профессия на пользователя — partial unique index.
- Аудио уникально по `(phrase_id, voice_id, speed)` — повторная генерация
  невозможна на уровне схемы, а не «по договорённости».

## 5. Локализация (§36)

German — source language, лежит прямо в `phrases.german_text`.
Всё остальное — в `*_translations` с `language_code`. Русский не выделен.
Enum направления — `DE_TO_L1 / L1_TO_DE`, а не `DE_TO_RU`, чтобы добавление
украинского не потребовало миграции enum.

UI-строки — отдельно, в JSON-словарях (`/messages/{locale}.json`), потому что
они меняются с релизами кода, а не с контентом.

## 6. Границы безопасности

Три независимых слоя, каждый достаточен сам по себе:

1. **RLS.** Deny by default на всех 40+ таблицах. Draft-фраза невидима для
   `authenticated` вообще — не «скрыта в UI», а не возвращается из БД.
2. **Server guards.** `requireUser / requireOnboarded / requireAdmin /
   requireFullAccess`. `requireAdmin` перепроверяет роль через `public.is_admin()`
   в БД, а не по claim из токена.
3. **proxy.ts.** Только грубая маршрутизация и refresh сессии. Его обход
   сам по себе ничего не открывает.

Service-role ключ живёт в четырёх местах и нигде больше: Stripe webhook,
генератор аудио, admin actions после `requireAdmin()`, серверная оценка тестов.
`import 'server-only'` превращает утечку в ошибку сборки.

Аудиофайлы — приватный bucket. Клиент получает короткоживущий signed URL после
серверной проверки entitlement и видимости фразы.

## 7. Демо-режим (§39)

Нет ключа Stripe → `PaymentProvider = mock` (мгновенный grant FULL_ACCESS).
Нет ключа ElevenLabs → `AudioProvider = mock` (демо-клипы из репозитория).
Приложение поднимается и проходит E2E без единого внешнего ключа.

Production при этом **отказывается стартовать**: мок-платежи в проде выдавали бы
полный доступ бесплатно. Обход — только явный `ALLOW_DEMO_MODE_IN_PRODUCTION=true`
для staging.

## 8. Риски

| # | Риск | Почему серьёзно | Что делаем |
|---|---|---|---|
| 1 | **Немецкая флексия в шаблонах** | `Schneid {object} …` требует аккузатива. Наивная подстановка лемм даст «Schneid der Platte» — грамматический мусор, который пользователь заучит как правильный | `template_slot_options.german_surface` хранит **готовую словоформу для конкретной позиции**. Движок конкатенирует и никогда не склоняет |
| 2 | **Ответственность за безопасность** | Приложение может быть воспринято как инструктаж. Юридически и этически недопустимо | Отдельный `safety_review`, дисклеймер в UI и в `/legal/disclaimer`, никаких технических инструкций по опасным работам |
| 3 | **Стоимость и качество TTS** | Регенерация на каждое воспроизведение убьёт бюджет; неверное произношение вобьёт ошибку в память | Один asset на `(phrase, voice, speed)`, инвалидция по `text_checksum`, обязательный `approved` перед публикацией |
| 4 | **Разрыв «схема готова / контента нет»** | Движок можно построить за недели, качественный контент — нет. Пустой продукт | Demo seed для UI; `search_queries` с нулём результатов как приоритетная очередь для контент-команды |
| 5 | **Стоимость семантической разметки** | Разметка компонентов вручную по каждой фразе — узкое место | Admin-редактор с выделением по тексту, автоподсказка из `vocabulary_items`, разметка обязательна только для фраз, участвующих в component-тестах |
| 6 | **RLS-политики на каждый запрос** | `has_full_access()` в политике 40 таблиц — риск по производительности | Функции `stable` + `security definer`, планировщик кэширует в рамках запроса; горячие списки читаются через серверные RPC с явной проверкой |
| 7 | **PWA-аудио на iOS** | Квоты и вытеснение кэша Safari; автовоспроизведение запрещено | Кэшируем только текущий модуль + избранное; воспроизведение всегда по явному тапу |
| 8 | **Идемпотентность Stripe** | Повторная доставка события → двойной grant/charge | `processed_webhook_events` (PK по event_id) + partial unique на активный entitlement |
| 9 | **Диалект против Hochdeutsch** | Реальный Polier в Баварии звучит не как TTS | Осознанно вне MVP: `voices.role_hint` и `register_level` оставляют место для региональных голосов позже |
| 10 | **Аудитория с A0 и низкой цифровой грамотностью** | Сложный онбординг = отвал на первом экране | ≤2 вопроса в онбординге, один primary CTA на главной, крупные тач-таргеты (§34) |

## 9. Порядок реализации

PHASE 1 ✅ схема + auth + RLS · 2 UI shell + онбординг + home · 3 контент-движок ·
4 аудиоплеер + listening · 5 SRS · 6 поиск/Show to German/избранное ·
7 admin CMS + workflow · 8 ElevenLabs · 9 Stripe · 10 PWA/offline ·
11 аналитика · 12 тесты/безопасность/документация.
