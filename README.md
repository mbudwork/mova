# Deutsch auf der Baustelle

Тренажёр немецкого для строителей: понимать на слух реальные команды
Bauleiter/Polier — действие, объект, место, количество, последовательность —
уточнять непонятное и коротко отвечать.

Не языковой курс. Не хобби, не семья, не путешествия.

```
HEAR → UNDERSTAND → REACT
```

## Статус

**PHASE 1 завершена:** схема БД, аутентификация, RLS, demo seed, демо-режим.
Дальше — PHASE 2 (мобильный UI shell, онбординг, главный экран).

## Быстрый старт

```bash
npm install
cp .env.example .env.local

supabase start                 # локальный Postgres + Auth + Storage
supabase db reset              # миграции + demo seed
supabase status                # взять anon key и service_role key в .env.local

npx supabase gen types typescript --local > src/types/database.ts
npm run dev                    # http://localhost:3000
```

Без ключей Stripe и ElevenLabs приложение стартует в **DEMO MODE**: покупка
мокается, аудио берётся из демо-клипов. Никаких падений из-за отсутствующих
внешних ключей. Production-сборка в демо-режиме стартовать откажется.

### Сделать себя админом

```sql
update profiles set role = 'admin' where id = '<auth-user-uuid>';
```

## Скрипты

```
npm run dev            dev-сервер
npm run build          production-сборка
npm run typecheck      tsc --noEmit (strict)
npm run lint
npm run test           Vitest
npm run test:e2e       Playwright
npm run types:check    падает, если src/types/database.ts устарел
```

## Документация

- `docs/ARCHITECTURE.md` — стек, карта сущностей, роуты, риски
- `docs/DATABASE.md` — миграции, правило видимости контента, индексы
- `docs/CONTENT_MODEL.md` — фразы, семьи, компоненты, шаблоны *(PHASE 3)*
- `docs/ELEVENLABS.md` *(PHASE 8)*, `docs/STRIPE.md` *(PHASE 9)*
- `docs/SECURITY.md`, `docs/DEPLOYMENT.md` *(PHASE 12)*

## Важное правило по контенту

Репозиторий содержит **движок и UI**, а не выверенную базу строительного
немецкого. В `supabase/seed.sql` лежит ~15 демо-фраз исключительно для проверки
интерфейса. Production-контент создаётся и проверяется отдельно, через пайплайн
`draft → language review → trade review → safety review → approved`.

Приложение — языковой тренажёр. Оно не заменяет Sicherheitsunterweisung,
профессиональное обучение, инструкции работодателя, требования BG BAU или
документацию производителя оборудования.
