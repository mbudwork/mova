# PHASE 4 — IMPORT PLAN

Источник: `deutsch_auf_der_baustelle_FINAL_v2.xlsx` (16 листов).
Excel — **source of truth**. Ни одна учебная строка не переписывается; при
конфликте адаптируется схема или import layer, а не контент.

---

## 1. Роли листов

| Лист | Роль | Использование |
|---|---|---|
| `FINAL Phrases` | **Production** | Канонический набор фраз (432) |
| `Supabase Import` | **Production** | Готовые булевы поля (`verified`, `safety_approved`, `is_safety`) |
| `Vocabulary` | **Production** | 317 терминов |
| `Lessons` | **Production** | 43 урока |
| `Lesson Map` | **Production** | 797 связей урок↔фраза с ролью |
| `Natural Variants` | **Production** | 12 наборов clear/normal/natural |
| `Phrase Families` | **Production** | 15 семей, 4 регистра |
| `Audio Manifest` | **Production** | 564 запланированных задания, все PENDING |
| `Test Templates` | **Production** | 10 определений механик |
| `Sources` | **Production metadata** | 15 источников, на которые ссылается контент |
| `Review Queue` | **Production metadata** | 10 открытых вопросов |
| `Production Gates` | **Production metadata** | 9 гейтов, все OPEN |
| `Phrases` | **Historical** | Пред-аудитная версия (433). Не импортируется |
| `README`, `Summary`, `FINAL Audit` | **Informational** | Сверка счётчиков |

---

## 2. Найденные конфликты и расхождения

### 2.1 `Phrases` (433) против `FINAL Phrases` (432)

Расходятся ровно на одну строку: **P0213** «Verschraub die Profile
miteinander.» / «Скрути профили между собой.» (TROCKENBAU, status=approved).

`FINAL Audit` подтверждает: `Dropped after audit: 1`. Решение: канонический
лист — `FINAL Phrases`, P0213 **не импортируется**. Строка зафиксирована здесь,
чтобы решение не потерялось.

### 2.2 `FINAL Phrases` против `Supabase Import`

**Расхождений нет.** Сверены построчно 432 ID и 11 полей (German, Russian,
Trade, Module, Stage, Priority, Speaker, Intent, Status, Source, Confidence) —
0 несовпадений. `Safety=YES/NO` полностью соответствует `is_safety`.

Решение: содержательные поля берутся из `FINAL Phrases`, булевы
(`verified`, `safety_approved`, `is_safety`) — из `Supabase Import`, поскольку
этот лист специально подготовлен под DB mapping.

### 2.3 Уроки L03 и L04 не имеют ни одной строки в `Lesson Map`

`L03 «Самые частые команды 1»` и `L04 «Самые частые команды 2»` описаны в
`Lessons`, но отсутствуют в `Lesson Map`. Урок без фраз — тупик в
пользовательском потоке.

Решение import layer: уроки **импортируются полностью** (не выбрасываются),
но с `is_published = false` и пометкой в `notes`. Контент не изменён; урок
просто не выдаётся пользователю, пока в `Lesson Map` не появятся строки.
**Требует решения контент-команды.**

### 2.4 134 фразы не входят ни в один урок

Импортируются как есть. Это законный материал для словаря, поиска, review pool
и будущих комбинаций. Не ошибка.

### 2.5 German-строки семей и natural variants почти не совпадают с фразами

| Набор | Совпало с `FINAL Phrases` |
|---|---|
| Family Level 1 (formal/clear) | 2 / 15 |
| Family Level 2 | 10 / 15 |
| Family Level 3 | 4 / 15 |
| Family Level 4 (natural) | **0 / 15** |
| NV Clear | 6 / 12 |
| NV Normal | 6 / 12 |
| NV Natural | **0 / 12** |

Плюс колонка `Family` в `FINAL Phrases` **пуста во всех 432 строках**.

Вывод: семьи и natural variants — самостоятельные наборы строк, а не ссылки на
таблицу фраз. Решение: хранить их варианты как собственные текстовые записи
(`phrase_family_variants`), а не как FK на `phrases`. Связь с фразами по
совпадению текста намеренно **не** строится: это была бы догадка.

### 2.6 `Production Gates` = все OPEN, при этом 404 строки имеют `status=approved`

`FINAL Audit` фиксирует статус «CONTENT COMPLETE / HUMAN REVIEW GATES OPEN»,
а построчный `Status` у 404 фраз — `approved`.

Решение: построчный `Status` операционален (импортируется как есть), гейты
сохраняются в БД как отдельная сущность со статусом OPEN. Импорт **не**
повышает confidence и **не** закрывает гейты. Расхождение вынесено в отчёт как
вопрос к владельцу контента: формально контент опубликуем, но девять гейтов
человеческой проверки не пройдены.

### 2.7 `safety_approved = true` у 404 не-safety фраз

`Supabase Import` ставит `safety_approved=true` для строк, где `is_safety=false`.
Флаг для них не имеет смысла. Импортируется **вербатим** (не меняем
safety-флаги), но отмечается: если такая фраза позже станет
safety-sensitive, она окажется предодобренной. Наблюдение по гигиене данных.

### 2.8 Проверки целостности — чисто

| Проверка | Итог |
|---|---|
| Дубли ID (фразы, словарь, уроки, семьи, NV) | 0 |
| `Lesson Map` → неизвестная фраза | 0 |
| `Lesson Map` → неизвестный урок | 0 |
| `Audio Manifest` → неизвестная фраза | 0 |
| `Lesson Map` дубли (lesson, phrase) | 0 |
| `order_no` уникален внутри (lesson, role) | да |
| Пустой German / Russian | 0 |
| Дубли `Audio Manifest` (phrase, voice, speed) | 0 |

`(lesson_id, order_no)` даёт 388 «дублей» — это не ошибка: `primary` и
`review_pool` нумеруются независимо. Уникальность обеспечивается тройкой
(lesson, role, order).

---

## 3. Mapping

### 3.1 Trade → профессия

| Excel | `professions.slug` | Обоснование |
|---|---|---|
| CORE | *(null)* | Общая база, не профессия |
| TROCKENBAU | `trockenbau` | прямое |
| FLIESEN | `fliesenleger` | переименование в существующий slug онбординга |
| MALER | `maler` | прямое |
| MAURER | `maurer` | прямое |
| ELEKTRO | `elektriker` | переименование |
| SHK | `sanitaer` | Sanitär-Heizung-Klima |

Онбординг PHASE 2 предлагает семь вариантов, включая `allgemein`. У `allgemein`
нет trade-контента — такой пользователь получает только CORE. Это корректно и
не требует изменений онбординга.

### 3.2 `FINAL Phrases` + `Supabase Import` → `phrases`

| Excel | Таблица.колонка | Трансформация | Обоснование |
|---|---|---|---|
| `ID` | `phrases.external_id` | как есть | ключ идемпотентности |
| `German` | `phrases.german_text` | как есть | source language |
| `Russian` | `phrase_translations.text` (`ru`) | как есть | локализуемо |
| `l1` / `target_lang` | — | проверка `ru`/`de` | подтверждают направление |
| `Trade` | `phrases.profession_id` | через таблицу выше | CORE → null |
| `Module` | `phrases.content_module` | как есть | новое поле |
| `Stage` | `phrases.stage` | `WORKING CORE`→`WORKING_CORE` | новый enum |
| `Priority` | `phrases.priority` | A/B/C | новый enum |
| `Speaker` | `phrases.speaker` | как есть | значения уже совпадают |
| `Intent` | `phrases.intent` | как есть | — |
| `Naturalness` | `phrases.register_level` | `natural` → 2 | все 432 = natural |
| `Safety` | `phrases.safety_sensitive` | YES→true | — |
| `safety_approved` | `phrases.safety_approved` | вербатим | см. 2.7 |
| `Status` | `phrases.verification_status` | `approved`/`safety_review` | значения совпадают с enum |
| `Source` | `phrases.source_ref` | как есть | новое поле, ссылки вида `S01/S02` |
| `Confidence` | `phrases.confidence` | как есть | новое поле |
| `Notes` | `phrases.notes` | как есть | — |
| `Family` | — | пусто во всех строках | не импортируется |
| — | `phrases.source_type` | `'imported'` | существующий enum |
| — | `phrases.is_free_preview` | `false` | см. отчёт: набор free-preview не задан Excel |

### 3.3 `Vocabulary` → `vocabulary_items` + `vocabulary_translations`

| Excel | Назначение |
|---|---|
| `ID` | `external_id` |
| `German` | `german_term` |
| `Russian` | `vocabulary_translations.term` (`ru`) |
| `Type` | `category` (verbatim: object/verb/material/…); `part_of_speech` = `verb` для type=verb, иначе `noun` |
| `Priority` | `priority` |
| `Module` | `content_module` |
| `Trade` | `profession_id` |
| `Colloquial/Formal note` | `colloquial_note` |
| `Source` | `source_ref` |
| `Confidence` | `confidence` |
| `Status` | `verification_status` |
| `Notes` | `notes` |

### 3.4 `Lessons` → `modules` + `lessons`

Модули создаются по треку, а не по колонке `Module`:

| Модуль | slug | scope | order_index |
|---|---|---|---|
| CORE | `core` | core | 1 |
| Trade ×6 | `trockenbau`, `fliesen`, `maler`, `maurer`, `elektro`, `shk` | profession | 2 |
| Assessment (L43) | `assessment` | core | 3 |

Порядок урока — **явный**: числовая часть `L01…L43`. Не вычисляется по
названию. Колонка `Module` сохраняется на уроке как `content_module`.

`Track=ALL` (только L43, «Trade final listening») → модуль `assessment`, scope
core: итоговый тест доступен всем, а его содержание уже привязано к специальности
через фразы.

### 3.5 `Lesson Map` → `lesson_phrases`

Добавляется колонка `role` (`primary` | `review_pool`). Уникальность —
`(lesson_id, role, order_index)`. Primary: 409 строк, 9–10 на урок (среднее
9.98) — совпадает с ориентиром 8–10 новых целей. Review pool: 388 строк.

### 3.6 `Phrase Families` и `Natural Variants` → `phrase_families` (+ варианты)

Обе сущности — одна коммуникативная функция в нескольких регистрах, поэтому
одна таблица с дискриминатором `kind`:

- `family` — 15 записей, регистры 1–4;
- `natural_variant` — 12 записей, регистры 1–3 (clear/normal/natural).

`Meaning` / `Russian meaning` → `phrase_family_translations` (`ru`).
Варианты → `phrase_family_variants(family_id, register_level, german_text)`.

### 3.7 `Audio Manifest` → `audio_assets` + `voices`

564 строки, все `PENDING`, `audio_url` пуст во всех.

Требуемые изменения схемы: `audio_assets.storage_path` становится nullable,
добавляется `status` (`pending`/`generated`/`approved`/`rejected`) и
check-constraint «путь обязателен, если не pending». Голоса `voice_1`,
`voice_2` создаются как записи `voices` с provider `pending` — ElevenLabs не
подключается, API не вызывается, MP3 не создаются.

### 3.8 Метаданные производственного процесса

`Sources` → `content_sources`; `Review Queue` → `review_queue`;
`Production Gates` → `production_gates`; `Test Templates` → `test_templates`.

Все четыре таблицы: RLS admin-only, обычному пользователю не видны (§27, §21).

---

## 4. Поля текущей схемы, не покрытые Excel

Остаются, заполняются значениями по умолчанию:
`natural_variant`, `formal_variant` (варианты живут в семьях),
`family_id` (колонка `Family` пуста), `frequency_score`, `difficulty`,
`min_level`, `is_free_preview`, `phrase_components` (семантическая разметка
Excel не содержит — движок шаблонов остаётся без production-данных).

Ничего из существующей схемы не удаляется.

---

## 5. Порядок исполнения

1. Миграция `20260823000500_production_content.sql` — расширения схемы.
2. `scripts/import-course-content.mjs` — валидация → импорт в транзакции.
3. Повторный запуск импортера — проверка идемпотентности.
4. Сверка счётчиков БД ↔ Excel.
5. Регрессия PHASE 3 на демо-данных + на production-данных.
