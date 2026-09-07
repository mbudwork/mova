# Подключение Stripe

Код готов и лежит в 11 файлах (см. список внизу). Здесь — что сделать руками.

**Ключи не присылайте в переписку.** Секретный ключ Stripe даёт полный доступ
к деньгам аккаунта. Если он где-то засветился — Developers → API keys → Roll
key. Всё ниже вводится напрямую в Stripe и в Netlify.

---

## Шаг 1. Цена в Stripe

Products → Add product. Название `MOVA — полный доступ`, цена **29 EUR**,
тип — **One time** (не Recurring: курс продаётся один раз, не по подписке).

После сохранения откройте продукт и скопируйте **Price ID** — строка вида
`price_1AbC...`. Это не то же самое, что Product ID (`prod_...`); код ждёт
именно Price ID, с Product ID создание сессии упадёт.

Начните в **тестовом режиме** (переключатель Test mode в Stripe). Тестовая
цена, тестовые ключи, тестовый webhook — всё отдельное от боевого.

## Шаг 2. Webhook

Developers → Webhooks → Add endpoint.

| Поле | Значение |
|---|---|
| Endpoint URL | `https://mbud.de/api/stripe/webhook` |
| Events | `checkout.session.completed` |

После создания Stripe покажет **Signing secret** — `whsec_...`. Скопируйте.

Этот секрет — единственное, что отличает настоящее уведомление об оплате от
подделки. Без него любой, кто знает адрес эндпоинта, мог бы отправить
«платёж прошёл» и выдать себе курс. Обработчик отвечает 400 на всё, что не
проходит проверку подписи.

## Шаг 3. Переменные в Netlify

Site configuration → Environment variables.

| Переменная | Значение | Secret |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...`, потом `sk_live_...` | да |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` из шага 2 | да |
| `STRIPE_PRICE_ID` | `price_...` из шага 1 | нет |
| `NEXT_PUBLIC_MOVA_PRICE_EUR` | `29` | нет |
| `NEXT_PUBLIC_CHECKOUT_ENABLED` | `true` | нет |

**Порядок имеет значение.** `NEXT_PUBLIC_CHECKOUT_ENABLED=true` без ключей
Stripe заставит приложение отказаться стартовать — это защита в `env.ts`,
чтобы mock-провайдер не раздал FULL_ACCESS без оплаты. Сначала три ключа,
флаг последним.

## Шаг 4. Деплой

```bash
cp -R ~/Downloads/stripe/. ~/mova-repo/
cd ~/mova-repo
npm ci                      # появился пакет stripe, package-lock обновлён
npm run typecheck && npm run test:unit
git add -A && git commit -m "feat: Stripe checkout + webhook entitlement grant"
git push origin main
```

## Шаг 5. Проверка в тестовом режиме

Перед проверкой снимите тестовый доступ со своего аккаунта — иначе
`/ru/checkout` теперь редиректит на `/app`, и до оплаты вы не дойдёте:

```sql
update entitlements set status = 'revoked' where source = 'manual_test';
```

Дальше: `/ru/checkout` → «Оплатить» → карта `4242 4242 4242 4242`, любая
будущая дата, любой CVC.

Что должно произойти:

1. Открылась страница Stripe с суммой 29 €.
2. После оплаты — возврат на `/purchase/success` с надписью «Доступ открыт».
3. В базе появилась строка `entitlements` с `source = 'stripe:cs_test_...'`.
4. Заявка в `checkout_leads` перешла в `converted`.
5. В Stripe → Webhooks → ваш эндпоинт: доставка со статусом 200.

Если на шаге 2 написано «Оплата принята», а не «Доступ открыт» — вебхук ещё
не дошёл. Обновите страницу. Если и через минуту не изменилось, смотрите
логи доставки в Stripe: там будет код ответа и тело ошибки.

## Шаг 6. Боевой режим

Переключите Stripe из Test mode, повторите шаги 1 и 2 (боевые цена и
webhook — отдельные объекты), замените три переменные в Netlify на боевые,
передеплойте.

---

## Как это устроено

Доступ выдаётся **только** вебхуком, после проверки подписи. Кнопка
«Оплатить» лишь создаёт сессию и уводит на Stripe; страница
`/purchase/success` ничего не выдаёт и не верит `session_id` из адреса —
это обычный редирект, который кто угодно откроет руками. Она только
показывает то, что уже есть в базе.

Три вещи сделаны намеренно:

- Проверяется `payment_status === 'paid'`, а не только `status === 'complete'`.
  Для асинхронных способов оплаты сессия закрывается раньше денег.
- Выдача идемпотентна по `session.id`, записанному в `entitlements.source`.
  Stripe повторяет доставку до первого 2xx и может прислать одно событие
  дважды даже при успехе.
- Ошибка базы возвращает 500, чтобы Stripe повторил (платёж настоящий, и
  выдача не должна потеряться из-за сбоя), а отсутствие `user_id` — 200,
  потому что повтор его не создаст и только закопает строку в логе.

## Файлы

Новые: `src/lib/payments/stripe.ts`, `src/app/api/stripe/webhook/route.ts`,
`src/app/purchase/success/page.tsx`.

Изменённые: `src/app/checkout/actions.ts`,
`src/components/landing/CheckoutScreen.tsx`, `src/proxy.ts`,
`src/app/ru/checkout/page.tsx`, `src/app/uk/checkout/page.tsx`,
`src/app/purchase/page.tsx`, `package.json`, `package-lock.json`.
