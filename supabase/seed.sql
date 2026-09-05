-- =============================================================================
-- DEMO SEED — development / UI testing only.
--
-- Deliberately tiny. Production German content is authored and reviewed by
-- native-speaker + trade reviewers through the admin pipeline (§44).
-- Nothing here should be treated as a vetted phrase bank.
-- =============================================================================

-- Languages and professions are NOT here: they are production reference data
-- and live in 20260823000250_reference_data.sql. This file is demo content only.

-- --------------------------------------------------------- CORE MODULES -----
insert into modules (slug, scope, order_index, min_level, is_published)
values
  ('erster-tag',        'core',  1, 'B0', true),
  ('grundbefehle',      'core',  2, 'B0', true),
  ('werkzeug-material', 'core',  3, 'B0', true),
  ('ort-richtung',      'core',  4, 'B1', true),
  ('zahlen-masse',      'core',  5, 'B1', true),
  ('reihenfolge',       'core',  6, 'B1', true),
  ('qualitaet',         'core',  7, 'B2', true),
  ('fehler-nacharbeit', 'core',  8, 'B2', true),
  ('nachfragen',        'core',  9, 'B0', true),
  ('sicherheit',        'core', 10, 'B0', true),
  ('arbeitstag',        'core', 11, 'B1', true),
  ('abnahme',           'core', 12, 'B3', true)
on conflict (slug) do nothing;

insert into module_translations (module_id, language_code, title)
select m.id, 'ru', v.title
from (values
  ('erster-tag',        'Первый день на объекте'),
  ('grundbefehle',      'Основные команды прораба'),
  ('werkzeug-material', 'Инструменты и материалы'),
  ('ort-richtung',      'Место и направление'),
  ('zahlen-masse',      'Числа и размеры'),
  ('reihenfolge',       'Последовательность работы'),
  ('qualitaet',         'Качество работы'),
  ('fehler-nacharbeit', 'Ошибки и переделка'),
  ('nachfragen',        'Не понял — уточни'),
  ('sicherheit',        'Безопасность'),
  ('arbeitstag',        'Рабочий день'),
  ('abnahme',           'Сдача работы')
) as v(slug, title)
join modules m on m.slug = v.slug
on conflict do nothing;

-- Profession module stubs (architecture check only, no content yet).
insert into modules (slug, scope, profession_id, order_index, min_level, is_published)
select 'trade-' || p.slug, 'profession', p.id, 100, 'B3', false
from professions p where p.slug <> 'allgemein'
on conflict (slug) do nothing;

-- -------------------------------------------------------------- LESSONS -----
insert into lessons (module_id, slug, kind, order_index, est_minutes, is_published)
select m.id, 'grundbefehle-01', 'mixed', 1, 10, true
from modules m where m.slug = 'grundbefehle'
on conflict (slug) do nothing;

insert into lesson_translations (lesson_id, language_code, title, goal)
select l.id, 'ru', 'Команды прораба — часть 1',
       'Понимать на слух простые команды: принеси, сделай ещё раз, здесь неправильно.'
from lessons l where l.slug = 'grundbefehle-01'
on conflict do nothing;

-- ------------------------------------------------------- PHRASE FAMILY ------
insert into phrase_families (key, intent, notes) values
  ('bring_wasserwaage', 'request_tool',
   'Same intention, four registers. Level 1 formal Sie-form, level 4 site slang.')
on conflict (key) do nothing;

-- --------------------------------------------------------------- PHRASES ----
-- All demo phrases are pre-approved so the UI has something to render.
-- Real content enters at status=draft and walks the review pipeline.
with m as (select id, slug from modules),
ins as (
  insert into phrases (
    german_text, natural_variant, formal_variant, intent, speaker,
    register_level, difficulty, frequency_score, min_level,
    safety_sensitive, safety_approved, verification_status, source_type, is_free_preview)
  values
    ('Hol bitte die Wasserwaage.', 'Hol mal kurz die Wasserwaage rüber.',
     'Bitte holen Sie die Wasserwaage.', 'request_tool', 'polier',
     2, 1, 95, 'B0', false, false, 'approved', 'manual', true),
    ('Mach das nochmal.', 'Mach das nochmal.', 'Bitte machen Sie das noch einmal.',
     'redo_task', 'bauleiter', 2, 1, 90, 'B0', false, false, 'approved', 'manual', true),
    ('Das Maß stimmt nicht.', null, 'Das Maß stimmt leider nicht.',
     'report_wrong_measure', 'bauleiter', 2, 2, 80, 'B1', false, false, 'approved', 'manual', true),
    ('Wo genau?', null, 'Wo genau, bitte?', 'ask_location', 'worker',
     3, 1, 85, 'B0', false, false, 'approved', 'manual', false),
    ('Ein bisschen weiter nach links.', 'Bisschen weiter links.', null,
     'give_direction', 'polier', 2, 2, 75, 'B1', false, false, 'approved', 'manual', false),
    ('Das ist zu kurz.', null, null, 'report_quality', 'bauleiter',
     2, 1, 78, 'B0', false, false, 'approved', 'manual', false),
    ('Wir brauchen noch Kleber.', 'Der Kleber ist alle.', null,
     'report_missing_material', 'worker', 2, 2, 82, 'B1', false, false, 'approved', 'manual', false),
    ('Mach zuerst diese Wand fertig.', null, null, 'set_sequence', 'bauleiter',
     2, 2, 70, 'B1', false, false, 'approved', 'manual', false),
    ('Vorsicht!', null, null, 'warn', 'colleague',
     2, 1, 99, 'B0', true, true, 'approved', 'manual', true),
    ('Nicht anfassen!', null, null, 'warn_prohibition', 'bauleiter',
     2, 1, 88, 'B0', true, true, 'approved', 'manual', true),
    ('Schneid die Platte fünf Zentimeter kürzer und stell sie danach hier hin.',
     null, null, 'compound_command', 'polier',
     2, 4, 60, 'B2', false, false, 'approved', 'manual', false)
  returning id, german_text
)
insert into phrase_translations (phrase_id, language_code, text, pronunciation, keywords)
select ins.id, 'ru', v.ru, v.pron, v.kw
from ins
join (values
  ('Hol bitte die Wasserwaage.', 'Принеси, пожалуйста, уровень.', 'холь битэ ди вассэрваагэ', array['уровень','ватерпас','инструмент']),
  ('Mach das nochmal.', 'Сделай это ещё раз.', 'мах дас нохмаль', array['переделай','ещё раз']),
  ('Das Maß stimmt nicht.', 'Размер неправильный.', 'дас маас штимт нихт', array['размер','не сходится','неправильно']),
  ('Wo genau?', 'Где именно?', 'во генау', array['где','уточнить место']),
  ('Ein bisschen weiter nach links.', 'Немного дальше влево.', 'айн бисхен вайтэр нах линкс', array['влево','левее','сдвинь']),
  ('Das ist zu kurz.', 'Это слишком короткое.', 'дас ист цу курц', array['коротко','мало']),
  ('Wir brauchen noch Kleber.', 'Нам нужен ещё клей.', 'вир браухен нох клебэр', array['клей','закончился клей','нужен клей']),
  ('Mach zuerst diese Wand fertig.', 'Сначала закончи эту стену.', 'мах цуэрст дизэ вант фертих', array['сначала','стена','закончить']),
  ('Vorsicht!', 'Осторожно!', 'форзихт', array['осторожно','внимание','опасно']),
  ('Nicht anfassen!', 'Не трогать!', 'нихт анфассэн', array['не трогать','нельзя']),
  ('Schneid die Platte fünf Zentimeter kürzer und stell sie danach hier hin.',
   'Отрежь плиту на пять сантиметров короче и потом поставь её сюда.',
   'шнайд ди платэ фюнф центиметэр кюрцэр унд штэль зи данах хир хин',
   array['отрезать','плита','короче','поставить'])
) as v(de, ru, pron, kw) on v.de = ins.german_text;

-- Attach the family + the other three registers of the same intention (§14).
update phrases p set family_id = f.id, register_level = 2
from phrase_families f
where f.key = 'bring_wasserwaage' and p.german_text = 'Hol bitte die Wasserwaage.';

with ins as (
  insert into phrases (german_text, intent, speaker, family_id, register_level,
                       difficulty, frequency_score, verification_status, is_free_preview)
  select v.de, 'request_tool', 'polier', f.id, v.lvl, v.diff, 70, 'approved', false
  from phrase_families f,
       (values
         ('Bitte holen Sie die Wasserwaage.', 1, 1),
         ('Hol mal die Wasserwaage.',         3, 2),
         ('Hol mal kurz die Wasserwaage rüber.', 4, 3)
       ) as v(de, lvl, diff)
  where f.key = 'bring_wasserwaage'
  returning id, german_text
)
insert into phrase_translations (phrase_id, language_code, text, keywords)
select ins.id, 'ru', 'Принеси, пожалуйста, уровень.', array['уровень','ватерпас']
from ins;

-- --------------------------------------------- SEMANTIC COMPONENTS (§10) ----
insert into phrase_components (phrase_id, component_type, surface_text, order_index)
select p.id, v.ctype::component_type, v.surface, v.idx
from phrases p
join (values
  ('ACTION',      'Schneid',         0),
  ('OBJECT',      'die Platte',      1),
  ('MEASUREMENT', 'fünf Zentimeter', 2),
  ('QUALITY',     'kürzer',          3),
  ('SEQUENCE',    'danach',          4),
  ('ACTION',      'stell',           5),
  ('LOCATION',    'hier',            6)
) as v(ctype, surface, idx) on true
where p.german_text = 'Schneid die Platte fünf Zentimeter kürzer und stell sie danach hier hin.';

-- ------------------------------------------------------------- LESSON MAP ---
insert into lesson_phrases (lesson_id, phrase_id, order_index)
select l.id, p.id, row_number() over (order by p.frequency_score desc)
from lessons l, phrases p
where l.slug = 'grundbefehle-01'
  and p.german_text in ('Hol bitte die Wasserwaage.', 'Mach das nochmal.',
                        'Das Maß stimmt nicht.', 'Wo genau?', 'Das ist zu kurz.')
on conflict do nothing;

-- -------------------------------------------------------------- VOCABULARY --
with v as (
  insert into vocabulary_items (german_term, formal_term, colloquial_term, article,
                                category, frequency, difficulty, verification_status)
  values
    ('Winkelschleifer', 'Winkelschleifer', 'Flex',       'der', 'tool', 90, 2, 'approved'),
    ('Wasserwaage',     'Wasserwaage',     'Waage',      'die', 'tool', 95, 1, 'approved'),
    ('Fliesenkleber',   'Fliesenkleber',   'Kleber',     'der', 'material', 80, 2, 'approved'),
    ('Zentimeter',      'Zentimeter',      'Zenti',      'der', 'measurement', 92, 1, 'approved')
  returning id, german_term
)
insert into vocabulary_translations (vocabulary_item_id, language_code, term, synonyms)
select v.id, 'ru', t.ru, t.syn
from v join (values
  ('Winkelschleifer', 'болгарка',        array['УШМ','углошлифовальная машина','флекс']),
  ('Wasserwaage',     'уровень',         array['ватерпас','пузырьковый уровень']),
  ('Fliesenkleber',   'плиточный клей',  array['клей','клей для плитки']),
  ('Zentimeter',      'сантиметр',       array['см'])
) as t(de, ru, syn) on t.de = v.german_term;

-- ------------------------------------------------ TEMPLATE ENGINE DEMO ------
-- Slot options store fully inflected surfaces (accusative here) — the engine
-- concatenates, it never declines German by itself.
with tpl as (
  insert into content_templates (pattern, description, speaker, difficulty, verification_status)
  values ('Schneid {object} {measurement} kürzer.',
          'Cut-shorter command. Object slot must be accusative.',
          'polier', 3, 'approved')
  returning id
), slots as (
  insert into template_slots (template_id, slot_key, component_type, position)
  select tpl.id, v.k, v.c::component_type, v.p
  from tpl, (values ('object','OBJECT',0), ('measurement','MEASUREMENT',1)) as v(k,c,p)
  returning id, slot_key
), opts as (
  insert into template_slot_options (slot_id, german_surface, approved)
  select s.id, v.surface, true
  from slots s join (values
    ('object',      'die Platte'),
    ('object',      'das Profil'),
    ('measurement', 'fünf Zentimeter'),
    ('measurement', 'zehn Zentimeter')
  ) as v(k, surface) on v.k = s.slot_key
  returning id, german_surface
)
insert into template_slot_option_translations (option_id, language_code, text)
select o.id, 'ru', t.ru
from opts o join (values
  ('die Platte',      'плиту'),
  ('das Profil',      'профиль'),
  ('fünf Zentimeter', 'на пять сантиметров'),
  ('zehn Zentimeter', 'на десять сантиметров')
) as t(de, ru) on t.de = o.german_surface;

-- ------------------------------------------------------------------ VOICE ---
insert into voices (provider, provider_voice_id, label, gender, role_hint)
values ('mock', 'mock-polier-male', 'Demo Polier (m)', 'male', 'polier')
on conflict do nothing;

-- =============================================================================
-- PHASE 3 — additional demo lessons.
-- Enough structure to exercise ordering, completion and profession filtering:
-- two core modules with three lessons, plus one trade lesson.
-- =============================================================================

insert into lessons (module_id, slug, kind, order_index, est_minutes, is_published)
select m.id, v.slug, v.kind::lesson_kind, v.ord, 8, true
from (values
  ('erster-tag',  'erster-tag-01',   'mixed',     1),
  ('grundbefehle','grundbefehle-02', 'listening', 2)
) as v(module_slug, slug, kind, ord)
join modules m on m.slug = v.module_slug
on conflict (slug) do nothing;

-- Trade lesson for Trockenbau only. A Fliesenleger must never be routed here.
update modules set is_published = true where slug = 'trade-trockenbau';

insert into lessons (module_id, slug, kind, order_index, est_minutes, is_published)
select m.id, 'trockenbau-01', 'mixed', 1, 8, true
from modules m where m.slug = 'trade-trockenbau'
on conflict (slug) do nothing;

insert into lesson_translations (lesson_id, language_code, title, goal)
select l.id, 'ru', v.title, v.goal
from (values
  ('erster-tag-01',   'Первый день на объекте', 'Понимать, куда идти и с чего начать.'),
  ('grundbefehle-02', 'Команды прораба — часть 2', 'Понимать команды только на слух.'),
  ('trockenbau-01',   'Trockenbau: начало',     'Слова и команды для гипсокартона.')
) as v(slug, title, goal)
join lessons l on l.slug = v.slug
on conflict do nothing;

insert into lesson_phrases (lesson_id, phrase_id, order_index)
select l.id, p.id, v.ord
from (values
  ('erster-tag-01',   'Wo genau?',                        1),
  ('erster-tag-01',   'Vorsicht!',                        2),
  ('erster-tag-01',   'Nicht anfassen!',                  3),
  ('grundbefehle-02', 'Ein bisschen weiter nach links.',  1),
  ('grundbefehle-02', 'Mach zuerst diese Wand fertig.',   2),
  ('grundbefehle-02', 'Wir brauchen noch Kleber.',        3),
  ('trockenbau-01',   'Das Maß stimmt nicht.',            1),
  ('trockenbau-01',   'Das ist zu kurz.',                 2)
) as v(lesson_slug, german, ord)
join lessons l on l.slug = v.lesson_slug
join phrases p on p.german_text = v.german
on conflict do nothing;
