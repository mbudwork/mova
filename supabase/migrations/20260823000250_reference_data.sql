-- =============================================================================
-- Deutsch auf der Baustelle — 0002b: reference data
--
-- NOT demo data. This must exist in production: profiles.ui_locale has an FK to
-- languages, so signup fails outright if 'ru' is missing. Reference rows belong
-- in a migration, never in seed.sql.
-- =============================================================================

insert into languages (code, name_native, name_en, is_source, is_active, sort_order) values
  ('de', 'Deutsch',    'German',    true,  true,  0),
  ('ru', 'Русский',    'Russian',   false, true,  1),
  -- Prepared but inactive until translated content exists (§2, §36).
  ('uk', 'Українська', 'Ukrainian', false, false, 2),
  ('pl', 'Polski',     'Polish',    false, false, 3),
  ('ro', 'Română',     'Romanian',  false, false, 4),
  ('bg', 'Български',  'Bulgarian', false, false, 5),
  ('en', 'English',    'English',   false, false, 6)
on conflict (code) do nothing;

insert into professions (slug, icon, sort_order) values
  ('allgemein',    'hard-hat', 0),
  ('trockenbau',   'panel',    1),
  ('fliesenleger', 'tile',     2),
  ('maler',        'roller',   3),
  ('maurer',       'brick',    4),
  ('elektriker',   'bolt',     5),
  ('sanitaer',     'pipe',     6)
on conflict (slug) do nothing;

insert into profession_translations (profession_id, language_code, name)
select p.id, 'ru', v.name
from (values
  ('allgemein',    'Разнорабочий / Allgemein'),
  ('trockenbau',   'Гипсокартон / Trockenbau'),
  ('fliesenleger', 'Плиточник / Fliesenleger'),
  ('maler',        'Маляр / Maler'),
  ('maurer',       'Каменщик / Maurer'),
  ('elektriker',   'Электрик / Elektriker'),
  ('sanitaer',     'Сантехник / Sanitär-Heizung')
) as v(slug, name)
join professions p on p.slug = v.slug
on conflict do nothing;
