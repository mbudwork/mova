# SECURITY

## Три независимых слоя

| Слой | Что делает | Что будет, если обойти только его |
|---|---|---|
| RLS | Deny by default на всех таблицах | Ничего: у роли `authenticated` нет и прав на запись |
| Table grants | У браузерной роли нет INSERT/UPDATE на контенте | Ничего: RLS всё равно фильтрует чтение |
| Server guards | `requireUser` / `requireOnboarded` / `requireAdmin` / `requireFullAccess` | Ничего: БД не отдаст чужие данные |

`proxy.ts` — не слой безопасности. Он обновляет сессию и делает грубый
редирект. Его обход сам по себе ничего не открывает.

## Правило видимости контента

Одно, продублированное в политиках `phrases`, `phrase_translations`,
`phrase_components` и `audio_assets` — чтобы JOIN не обошёл проверку через
связанную таблицу:

```sql
verification_status = 'approved'
  AND (NOT safety_sensitive OR safety_approved)
  AND (is_free_preview OR has_full_access())
```

## Проверено на живой БД

`supabase/tests/rls_smoke.sql`, PostgreSQL 16:

| Проверка | Результат |
|---|---|
| Draft виден USER | 0 строк |
| Safety без approval виден USER | 0 строк |
| Vocabulary без entitlement | 0 строк |
| Чужие профили | не видны |
| Самоповышение до admin | заблокировано триггером |
| Прямая запись в `phrases` из браузера | permission denied |

## Service role

Ключ, обходящий RLS, допустим ровно в четырёх местах: Stripe webhook,
генератор аудио, admin-действия после `requireAdmin()`, серверная оценка
тестов. `import 'server-only'` превращает утечку в клиент в ошибку сборки.

## Аутентификация

- Везде `supabase.auth.getUser()`, никогда `getSession()`: первый
  перепроверяет JWT на сервере авторизации, второй верит cookie.
- Сообщение об ошибке входа одинаково для «нет такой почты» и «неверный
  пароль» — иначе форма превращается в перебор зарегистрированных адресов.
- Повышение роли невозможно из клиента: триггер `prevent_role_escalation()`
  откатывает `NEW.role` к `OLD.role`, если вызывающий не админ.

## Демо-режим

Нет ключей → mock-провайдеры. Production-сервер с mock-платежами стартовать
отказывается: они выдали бы FULL_ACCESS без оплаты. Исключение — явный
`ALLOW_DEMO_MODE_IN_PRODUCTION=true` для staging.

Сборка (`next build`) при этом проходит: CI не должен требовать боевых
секретов для компиляции. Guard срабатывает на старте сервера, не на сборке.

## Что ещё не сделано

- Rate limiting на поиске и попытках входа — PHASE 6/12.
- Проверка подписи Stripe webhook и таблица идемпотентности созданы, но
  обработчик не написан — PHASE 9.
- Приватный bucket `audio` создан; выдача signed URL — PHASE 4.
- Юридические страницы (Impressum, Datenschutz, AGB) отсутствуют. Для рынка
  Германии это блокер запуска, а не косметика.
