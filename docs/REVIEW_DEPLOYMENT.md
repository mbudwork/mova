# OWNER REVIEW DEPLOYMENT

Всё, что можно было подготовить со стороны кода, подготовлено. Осталось то,
что требует доступа к внешним сервисам.

## Почему я не развернул сам

Сетевой egress контейнера ограничен белым списком. Проверено запросами:

```
api.vercel.com    403  x-deny-reason: host_not_allowed
vercel.com        403  x-deny-reason: host_not_allowed
api.supabase.com  403  x-deny-reason: host_not_allowed
supabase.com      403  x-deny-reason: host_not_allowed
api.netlify.com   403  x-deny-reason: host_not_allowed
api.railway.app   403  x-deny-reason: host_not_allowed
api.render.com    403  x-deny-reason: host_not_allowed
```

Разрешены только npm, PyPI, GitHub и Ubuntu-зеркала. Учётных данных Vercel или
Supabase в окружении тоже нет. Развернуть проект отсюда физически нельзя.

## Вариант A — вы даёте доступ, разворачиваю я

1. В настройках Claude разрешите сетевой доступ к доменам:
   `api.vercel.com`, `vercel.com`, `api.supabase.com`, `*.supabase.co`,
   `*.pooler.supabase.com`.
2. Создайте два токена и пришлите их мне:
   - Vercel → Account Settings → Tokens → Create Token;
   - Supabase → Account → Access Tokens → Generate new token.
3. Дальше я делаю всё сам: создаю проект Supabase, применяю миграции,
   импортирую контент, создаю review-аккаунт, деплою и присылаю ссылку.

Токены дают доступ к вашим аккаунтам — после проверки их стоит отозвать.

## Вариант B — одна команда с вашей стороны

### Шаг 1. Проект Supabase

1. https://supabase.com/dashboard → **New project**.
2. Регион **Central EU (Frankfurt)** — ближе к пользователям в Германии.
3. Придумайте Database Password и сохраните.
4. После создания: **Project Settings → API**, скопируйте
   - Project URL
   - `anon` `public` key
   - `service_role` key
5. **Project Settings → General**, скопируйте Reference ID.

### Шаг 2. Локально, в папке проекта

```bash
npm install
npm i -g supabase vercel
supabase login
vercel login
vercel link          # создать новый проект, когда спросит

export SUPABASE_PROJECT_REF='<Reference ID>'
export SUPABASE_DB_PASSWORD='<Database Password>'
export NEXT_PUBLIC_SUPABASE_URL='<Project URL>'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='<anon key>'
export SUPABASE_SERVICE_ROLE_KEY='<service_role key>'
export REVIEW_EMAIL='ваша@почта'

./scripts/deploy-review.sh
```

Скрипт применит миграции, импортирует Content Master, сверит счётчики,
создаст review-аккаунт со случайным паролем, положит переменные в окружение
Vercel и задеплоит. В конце он напечатает URL, логин и пароль.

Если регион вашего проекта не Frankfurt, поправьте хост пула в
`scripts/deploy-review.sh` — он показан в Supabase → Project Settings →
Database → Connection pooling.

### Шаг 3. Пришлите мне

- URL деплоя;
- вывод шага 3 скрипта (счётчики импорта).

Пароль review-аккаунта мне не нужен и присылать его не надо.

## Что уже сделано под review build

| | |
|---|---|
| `vercel.json` | `X-Robots-Tag: noindex, nofollow, noarchive` на всех маршрутах |
| `src/app/robots.ts` | `Disallow: /` — блокировка и через robots.txt, и через заголовок |
| `scripts/create-review-user.mjs` | Обычный пользователь + entitlement через нормальную модель |
| `scripts/deploy-review.sh` | Миграции → импорт → сверка → аккаунт → деплой |

## Безопасность review-аккаунта

- Пароль генерируется из 24 байт `crypto.randomBytes`, печатается один раз и
  нигде не сохраняется. В коде и бандле его нет.
- Аккаунт входит через обычный Supabase Auth и получает контент через обычные
  RLS-политики. Ничего не обходится.
- Entitlement пишется server-side, ровно как это будет делать Stripe webhook в
  PHASE 9. Приложение не выдаёт доступ само себе.
- `service_role` ключ используется только скриптом создания аккаунта, на вашей
  машине. В рантайме приложения он нужен лишь серверным маршрутам и в клиент
  не попадает (`import 'server-only'` делает утечку ошибкой сборки).
- RLS не отключается, production-контент публичным не делается.

## Открытая регистрация

`/register` на review-сборке доступен любому, кто знает URL. Это не дыра:
новый аккаунт не получает entitlement и не видит ни одной production-фразы —
поведение проверено тестами и RLS smoke. Закрывать регистрацию я не стал,
потому что это изменение продуктовой логики, а не deployment blocker.

## Что не проверено до реального деплоя

- Живой Supabase/PostgREST: все тесты идут против PostgreSQL напрямую,
  вложенные select типизированы, но через PostgREST не исполнялись.
- Мобильные проверки на устройстве: без запущенного Supabase пройти
  login → onboarding → урок локально нельзя. Статические проверки вёрстки
  (320 px, тач-таргеты, overflow) выполнены в PHASE 2.
- E2E Playwright: браузеры не устанавливаются, CDN недоступен.
