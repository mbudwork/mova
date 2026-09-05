# PHASE 4 — CONTENT REPORT

Источник: `content/deutsch_auf_der_baustelle_FINAL_v2.xlsx`
Импортёр: `scripts/import-course-content.mjs`
Миграция: `20260823000500_production_content.sql`

---

## 1. Импортировано

| Сущность | Ожидалось (Excel) | Импортировано | Отклонено |
|---|---|---|---|
| Production phrases | 432 | **432** | 0 |
| Phrase translations (ru) | 432 | **432** | 0 |
| Vocabulary | 317 | **317** | 0 |
| Lessons | 43 | **43** | 0 |
| Lesson map | 797 + 27 корректировок | **824** | 0 |
| Natural variants | 12 | **12** | 0 |
| Phrase families | 15 | **15** | 0 |
| Family variants (регистры) | 96 | **96** | 0 |
| Audio manifest | 564 | **564** | 0 |
| Sources | 15 | **15** | 0 |
| Production gates | 9 | **9** | 0 |
| Review queue | 10 | **10** | 0 |
| Test templates | 10 | **10** | 0 |

**Сгенерировано аудио: 0.** Все 564 записи в статусе `pending`, `storage_path`
пуст во всех, ElevenLabs не подключён, ни одного вызова API.

Lesson map по ролям: **425 primary**, **399 review_pool**. Primary на урок:
6–10 (максимум 10) — в пределах ориентира 8–10 новых целей, кроме L04 (6, см.
раздел 10).

## 2. Использованные листы

**Production (импортируются):** `FINAL Phrases`, `Supabase Import`,
`Vocabulary`, `Lessons`, `Lesson Map`, `Natural Variants`, `Phrase Families`,
`Audio Manifest`, `Test Templates`, `Sources`, `Review Queue`,
`Production Gates`.

**Informational (не импортируются):** `README`, `Summary`, `FINAL Audit` —
использованы для сверки счётчиков.

**Historical (не импортируется):** `Phrases` (433 строки, пред-аудитная версия).

## 3. Изменения схемы

Миграция `0005`, только расширения — ничего не удалено:

- `phrases`: `external_id`, `priority`, `stage`, `content_module`,
  `source_ref`, `confidence`;
- `vocabulary_items`: те же плюс `colloquial_note`;
- `lessons`: `external_id`, `track`, `content_module`, `outcome`, `notes`;
- `lesson_phrases`: `role` (`primary` / `review_pool`) + уникальность
  `(lesson, role, order)`;
- `audio_assets`: `storage_path` стал nullable, добавлены `status` и
  `external_ref`, добавлен check «путь обязателен, если не pending»;
- `phrase_families`: `external_id`, `kind`, `content_module`, `profession_id`,
  `status`, `source_ref`; новые `phrase_family_variants`,
  `phrase_family_translations`;
- новые таблицы: `content_sources`, `production_gates`, `review_queue`,
  `test_templates` — RLS admin-only, пользователю не видны;
- `verification_status` получил значение **`native_review`** (см. ниже).

## 4. Mapping-решения

1. **`native_review` добавлен в enum.** Excel использует этот статус для
   4 natural variants. Существующего `language_review` недостаточно: G01 и R002
   требуют именно носителя с опытом на стройке. Расширена схема, а не
   переименован контент.
2. **Trade → профессия:** `FLIESEN`→`fliesenleger`, `ELEKTRO`→`elektriker`,
   `SHK`→`sanitaer`, остальные напрямую. `CORE` → без профессии.
3. **Модули по треку**, не по колонке `Module`: `core`(1), шесть trade(2),
   `assessment`(3). Порядок урока — числовая часть `L01…L43`, явно, не по
   названию.
4. **`Track=ALL`** (только L43) → модуль `assessment`, scope core: итоговый
   тест доступен всем, его содержание уже привязано к специальности через фразы.
5. **Ordering-функция изменена.** Прежняя сортировка PHASE 3 ставила все
   profession-модули после всех core-модулей — верно для демо, но неверно для
   production, где итоговая проверка должна идти после trade-уроков. Теперь
   сортировка чисто `(module_order, lesson_order)`; порядок по-прежнему целиком
   из данных.
6. **Семьи и natural variants — одна таблица** с дискриминатором `kind`.
   Связь с `phrases` по совпадению текста намеренно не строится: Level 4
   совпадает с фразами 0/15, Natural — 0/12, колонка `Family` пуста во всех
   432 строках. Догадка была бы хуже отсутствия связи.
7. **`Type` словаря** → `category` вербатим; `part_of_speech` = `verb` для
   `type=verb`, иначе `noun`.

## 5. Отклонённые строки

**Ноль.** Валидатор прошёл на утверждённом workbook без единого замечания.

Не импортирована одна строка — **P0213** «Verschraub die Profile
miteinander.» — но она отсутствует в `FINAL Phrases`; `FINAL Audit` фиксирует
`Dropped after audit: 1`. Это решение контент-команды, а не отбраковка
импортёром. Тест подтверждает: строка есть в `Phrases`, нет в `FINAL Phrases`,
нет в БД.

## 6. Найденные конфликты

| # | Конфликт | Решение |
|---|---|---|
| 1 | `Phrases` (433) vs `FINAL Phrases` (432) | Канонический — `FINAL Phrases` |
| 2 | `FINAL Phrases` vs `Supabase Import` | **Расхождений нет** — сверены 432 ID × 11 полей, 0 несовпадений |
| 3 | L03, L04 без строк в `Lesson Map` | **Исправлено** — см. раздел 10. Оба урока опубликованы |
| 4 | Все 9 гейтов OPEN, но 404 строки `status=approved` | Построчный статус операционален; гейты сохранены со статусом OPEN. **Вопрос к владельцу контента** |
| 5 | `safety_approved=true` у 404 не-safety строк | Импортировано вербатим; отмечено как наблюдение по гигиене данных |
| 6 | Статус `native_review` вне enum | Enum расширен |
| 7 | 134 фразы вне уроков | Импортированы; законный материал для словаря, поиска и review pool |

## 7. Что осталось pending

- **564 аудиозадания** — все `pending`. PHASE 5.
- **9 production gates** — все OPEN.
- **10 позиций review queue** — все OPEN.
- **15 phrase families** — статус `native_review` (R002 требует носителя).
  Пользователю не видны.
- **4 natural variants** — `native_review`. Остальные 8 approved и видны.
- **28 safety-фраз** — `safety_review`, пользователю не видны.
- **Free preview отсутствует — и это соответствует продуктовой модели.**
  Бесплатного демо-контента не будет: оплата → доступ → регистрация → полный
  курс. Импортёр не выбирает бесплатные фразы, free-preview урок не создаётся,
  demo entitlement не создаётся. Колонка `is_free_preview` остаётся в схеме
  неиспользованной; отдельного бесплатного режима в архитектуре нет.
  Пользователь без entitlement не получает ни одной production-фразы —
  проверено тестом и RLS smoke.
- **`phrase_components` пуст** — Excel не содержит семантической разметки,
  поэтому движок шаблонов остаётся без production-данных.

## 8. Что требует человеческой проверки

| Кто | Что |
|---|---|
| Носитель DE + опыт стройки | G01 — весь CORE A/B и natural variants; R002 — F01–F15 |
| Trade-специалисты | G02–G05, G07; R003–R006, R008 |
| **Специалист по электробезопасности** | **G06 и R007 — ELEKTRO. 28 safety-фраз ждут именно этого. До подтверждения не видны никому** |
| Владелец продукта | G09, R001 — нагрузка на урок; пополнение CORE глаголами nehmen / geben / tragen (раздел 10) |
| Аудио-QA | G08, R010 — только после G01 |

## 9. Тесты

### Запускались

| Проверка | Итог |
|---|---|
| Typecheck (`tsc --noEmit`, strict) | **0 ошибок** |
| Unit | **3/3** |
| Integration, всего | **110/110** |
| — PHASE 3 регрессия на демо-данных | 33/33 |
| — Production content (интегрити, регрессия, smoke, L03/L04) | 53/53 |
| — Валидация импортёра | 24/24 |
| RLS smoke на production-БД | **12/12** |
| Production build | **успешно** |
| Идемпотентность (2 прогона) | счётчики не изменились |
| Сверка Excel ↔ БД | 13 сущностей, все совпали |

### Не запускались

**E2E Playwright.** Браузеры не устанавливаются: CDN недоступен из окружения
сборки — третья фаза подряд. Результат не имитировался. Запуск у вас:
`npx playwright install chromium && npm run test:e2e`.

**Против живого Supabase/PostgREST.** Тесты идут против PostgreSQL 16 с
настоящими миграциями и политиками; `auth.uid()` и storage застаблены, так как
Supabase CLI требует Docker.


---

## 10. Исправление L03 / L04

Дефект Content Master: уроки `L03 «Самые частые команды 1»` и
`L04 «Самые частые команды 2»` описаны в `Lessons`, но не имеют ни одной
строки в `Lesson Map`.

Исправлено файлом `content/lesson-map-corrections.json` — версионируемая
поправка, которую импортёр применяет поверх `Lesson Map` из workbook. Она
проходит ровно ту же валидацию, что и любая строка Excel, и может ссылаться
**только на уже существующие** phrase ID. Новых немецких фраз не создано.

### L03 — machen / holen / bringen · 10 primary

| # | ID | German | Глагол |
|---|---|---|---|
| 1 | P0107 | Mach das zuerst. | machen |
| 2 | P0111 | Mach das noch fertig. | machen |
| 3 | P0115 | Das machen wir jetzt. | machen |
| 4 | P0031 | Hol die Wasserwaage. | holen |
| 5 | P0032 | Hol die Leiter. | holen |
| 6 | P0033 | Hol den Hammer. | holen |
| 7 | P0047 | Hol das Material aus dem Transporter. | holen |
| 8 | P0048 | Bring das Material nach oben. | bringen |
| 9 | P0102 | Bring eine Rolle. | bringen |
| 10 | P0026 | Soll ich das jetzt machen? | ответ рабочего |

Review pool (6): P0034, P0035, P0041, P0042, P0112, P0114.

### L04 — stellen / legen · 6 primary

| # | ID | German | Глагол |
|---|---|---|---|
| 1 | P0049 | Stell das Material hier hin. | stellen |
| 2 | P0069 | Stell das hier hin. | stellen |
| 3 | P0079 | Stell es an die Wand. | stellen |
| 4 | P0050 | Leg das Werkzeug hier hin. | legen |
| 5 | P0070 | Leg das hier hin. | legen |
| 6 | P0080 | Leg es auf den Boden. | legen |

Review pool (5): P0053, P0081, P0071, P0077, P0078.

### Почему в L04 шесть, а не восемь–десять

В Content Master больше подходящих фраз нет. Проверено по всем 432 строкам:

| Глагол | Словарь | Фразы в курсе |
|---|---|---|
| `machen` | C001 (A) | 42 |
| `holen` | C002 (A) | 18 |
| `bringen` | C003 (A) | 7 |
| `stellen` | C010 (A) | 4 CORE |
| `legen` | C011 (A) | 3 CORE |
| **`nehmen`** | **C004 (A)** | **0 CORE** (только FLIESEN P0285, MAURER P0358) |
| **`geben`** | **C005 (A)** | **0 во всём курсе** |
| **`tragen`** | **C012 (A)** | **0 CORE** (только MAURER P0329) |
| **`halten`** | **C009 (A)** | только P0190 «Abstand halten!» — safety-sensitive, ждёт safety review, поэтому не может быть primary-целью |

Trade-фразы в CORE-урок не поставлены: это сломало бы разделение CORE/TRADE.
Safety-фраза без approval не поставлена: она не видна пользователю, и урок
отрисовался бы короче, чем размечен.

**Рекомендация контент-команде:** добавить в CORE фразы для `nehmen`, `geben`,
`tragen` и не-safety `halten`. Все четыре глагола уже присутствуют в словаре с
приоритетом A, то есть заявлены как базовые, но не покрыты ни одной командой.
До этого L04 останется тоньше остальных уроков.

### Проверено после исправления

| Проверка | Итог |
|---|---|
| Порядок курса | L01 → L02 → L03 → L04 → L05 … |
| L02 завершён → следующий | **L03** |
| L03 завершён → следующий | **L04** |
| L04 завершён → следующий | **L05** |
| Неопубликованные уроки | **нет** (было L03, L04) |
| L03 primary / L04 primary | 10 / 6 |
| Дубли phrase ID внутри урока | нет |
| Trade-контент в CORE-уроке | нет |
| Safety без approval как primary | нет |
| L03/L04 видны всем шести специальностям | да |
| Идемпотентность (2 прогона) | 824 строки, без изменений |
| Правило «урок без контента не публикуется» | сохранено и проверено отдельным тестом |
