# DATABASE

## Миграции

```
supabase/migrations/
  20260823000100_content_model.sql   enums, languages, professions, modules,
                                     lessons, phrases, components, vocabulary,
                                     template engine, audio, tests, review audit
  20260823000200_user_model.sql      profiles, entitlements, payments, progress,
                                     favorites, attempts, search, analytics
  20260823000300_rls.sql             helpers + RLS на всех таблицах + storage
supabase/seed.sql                    ДЕМО-данные для разработки
```

```bash
supabase start
supabase db reset          # применит миграции + seed
npx supabase gen types typescript --local > src/types/database.ts
```

## Как читается видимость контента

Единственное правило, от которого зависит всё остальное:

```sql
verification_status = 'approved'
  AND (NOT safety_sensitive OR safety_approved)
  AND (is_free_preview OR has_full_access())
```

Оно продублировано в политиках `phrases`, `phrase_translations`,
`phrase_components` и `audio_assets` — намеренно, чтобы никакой JOIN не мог
обойти проверку через связанную таблицу.

`draft` не виден `authenticated` ни в одной проекции. Это проверяется E2E-тестом
`draft invisible to user`, а не только код-ревью.

## Заметки по полям

| Поле | Почему так |
|---|---|
| `phrases.verified` | generated column от статуса — не может рассинхронизироваться |
| `phrases.direction` | `DE_TO_L1 / L1_TO_DE`: RU не зашит в enum |
| `phrases.register_level` | 1 = Sie-форма, 4 = разговорная стройка (§14) |
| `phrase_components.surface_text` | точная словоформа из предложения, не лемма |
| `template_slot_options.german_surface` | готовая падежная форма для позиции слота |
| `audio_assets.text_checksum` | правка `german_text` инвалидирует аудио |
| `phrase_progress.listening_accuracy` | generated, чтобы не считать в приложении |
| `search_queries` с `results_count = 0` | приоритетная очередь для контент-команды |

## Индексы для поиска

`pg_trgm` GIN на `phrases.german_text`, `phrase_translations.text`,
`vocabulary_items.german_term`, `vocabulary_translations.term`,
плюс GIN на массивах `keywords` и `synonyms`.

Запрос «болгарка» находит `Winkelschleifer` через `vocabulary_translations.term`
и `Flex` через `colloquial_term` того же item — поэтому синонимы живут в массиве
рядом с переводом, а не отдельной таблицей.

Полнотекстовый поиск (`tsvector` с немецким и русским словарём) — кандидат на
PHASE 6, если trigram даст слишком много шума.

## Что осознанно НЕ сделано в PHASE 1

- Материализованные вьюхи для аналитики — пока хватит прямых запросов.
- Партиционирование `analytics_events` — вернуться при >10M строк.
- Полнотекстовый поиск — см. выше.
- `module_progress` — выводится из `lesson_progress`, дублировать рано.
