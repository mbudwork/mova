#!/usr/bin/env python3
"""Generates idempotent SQL migrations for the MOVA content-candidate delta.

Source of truth: MOVA_MASTER_CONTENT.xlsx. Nothing here rewrites German or
Russian text; it maps workbook rows onto the existing schema, using the same
conventions the 423 production phrases already follow.
"""
import pandas as pd

XLSX = '/mnt/user-data/uploads/MOVA_MASTER_CONTENT.xlsx'
OUT = '/home/claude/work/sql'

x = pd.ExcelFile(XLSX)
new = x.parse('NEW_PHRASES')
voc = x.parse('VOCABULARY')
voc = voc[voc.STATUS == 'CONTENT_CANDIDATE']
les = x.parse('LESSONS')
nv = x.parse('NATURAL_VARIANTS')

# MODULE -> professions.slug (null for CORE); MODULE -> modules.slug
PROF = {'CORE': None, 'trockenbau': 'trockenbau', 'fliesenleger': 'fliesenleger',
        'maler': 'maler', 'maurer': 'maurer', 'elektriker': 'elektriker',
        'sanitaer': 'sanitaer'}
MODSLUG = {'CORE': 'core', 'trockenbau': 'trockenbau', 'fliesenleger': 'fliesen',
           'maler': 'maler', 'maurer': 'maurer', 'elektriker': 'elektro',
           'sanitaer': 'shk'}
PRIO = {'HIGH': 'A', 'MEDIUM': 'B', 'LOW': 'C'}
FREQ = {'HIGH': 80, 'MEDIUM': 50, 'LOW': 25}


def q(v):
    if v is None or (isinstance(v, float) and pd.isna(v)) or str(v).strip() in ('', 'nan'):
        return 'null'
    return "'" + str(v).strip().replace("'", "''") + "'"


def b(v):
    return 'true' if bool(v) else 'false'


# ------------------------------------------------------------- 1. PHRASES --
rows = []
for _, r in new.iterrows():
    safety = bool(r.SAFETY_SENSITIVE)
    rows.append('  (' + ','.join([
        q(r.PHRASE_ID), q(r.GERMAN), q(r.RUSSIAN),
        q(PROF[r.MODULE]),                                    # profession slug
        q(r.CATEGORY),                                        # content_module
        q('safety_recognition' if safety else 'trade_task'),  # intent
        q(PRIO[r.FREQUENCY]),                                 # priority
        q('WORKING_CORE' if r.MODULE == 'CORE' else 'TRADE'), # stage
        str(FREQ[r.FREQUENCY]),                               # frequency_score
        '2' if str(r.DIFFICULTY) == 'natural/compound' else '1',
        b(safety),
        q(r.SOURCE_BASIS), q(r.CONFIDENCE), q(r.COMMUNICATION_GAP_CLOSED),
    ]) + ')')

phrases_sql = f"""-- MOVA content candidate: 121 new phrases (NEW_PHRASES sheet).
-- Not production-approved: 107 enter native_review, 14 safety-sensitive enter
-- safety_review — the same convention the existing 28 safety phrases follow,
-- so none of them is readable through RLS until a reviewer approves it.
with src (external_id, german, russian, prof_slug, category, intent, priority,
          stage, freq, difficulty, safety, source_ref, confidence, notes) as (values
{",\n".join(rows)}
), up as (
  insert into phrases (
    external_id, german_text, intent, speaker, profession_id, content_module,
    priority, stage, register_level, frequency_score, difficulty,
    safety_sensitive, safety_approved, verification_status, source_type,
    source_ref, confidence, notes, is_free_preview)
  select s.external_id, s.german, s.intent, 'bauleiter', p.id, s.category,
         s.priority::content_priority, s.stage::content_stage, 2, s.freq, s.difficulty,
         s.safety, false,
         case when s.safety then 'safety_review' else 'native_review' end::verification_status,
         'imported', s.source_ref, s.confidence, s.notes, false
  from src s left join professions p on p.slug = s.prof_slug
  on conflict (external_id) do update set
    german_text         = excluded.german_text,
    intent              = excluded.intent,
    profession_id       = excluded.profession_id,
    content_module      = excluded.content_module,
    priority            = excluded.priority,
    stage               = excluded.stage,
    frequency_score     = excluded.frequency_score,
    difficulty          = excluded.difficulty,
    safety_sensitive    = excluded.safety_sensitive,
    verification_status = excluded.verification_status,
    source_ref          = excluded.source_ref,
    confidence          = excluded.confidence,
    notes               = excluded.notes
  returning id, external_id
)
insert into phrase_translations (phrase_id, language_code, text)
select up.id, 'ru', s.russian from up join src s on s.external_id = up.external_id
on conflict (phrase_id, language_code) do update set text = excluded.text;
"""

# ---------------------------------------------------------- 2. VOCABULARY --
vrows = []
for _, r in voc.iterrows():
    vrows.append('  (' + ','.join([
        q(r.VOCAB_ID), q(r.GERMAN), q(r.RUSSIAN),
        q(r.ARTICLE if str(r.ARTICLE) in ('der', 'die', 'das') else None),
        q(None if str(r.PLURAL).strip() in ('-', '–', 'nan') else r.PLURAL),
        q(r.CATEGORY), q(PROF[r.PROFESSION]),
        q(PRIO.get(str(r.FREQUENCY), 'B')), str(FREQ.get(str(r.FREQUENCY), 50)),
        q(r.EXAMPLE_PHRASE_IDS),
    ]) + ')')

vocab_sql = f"""-- MOVA content candidate: 53 new vocabulary items (VOCABULARY sheet,
-- STATUS = CONTENT_CANDIDATE). Enter native_review, so vocabulary_read RLS
-- (which requires 'approved') keeps them out of the dictionary until reviewed.
with src (external_id, german, russian, article, plural, category, prof_slug,
          priority, freq, example) as (values
{",\n".join(vrows)}
), up as (
  insert into vocabulary_items (
    external_id, german_term, article, plural_form, part_of_speech, category,
    profession_id, priority, content_module, frequency, verification_status,
    colloquial_note, source_ref, confidence, notes)
  select s.external_id, s.german, s.article, s.plural,
         case when s.category = 'verb' then 'verb' else 'noun' end,
         s.category, p.id, s.priority::content_priority, s.category, s.freq,
         'native_review', null, 'MOVA_MASTER_CONTENT.xlsx', 'MEDIUM',
         case when s.example is null then null
              else 'Пример употребления из воркбука: ' || s.example end
  from src s left join professions p on p.slug = s.prof_slug
  on conflict (external_id) do update set
    german_term         = excluded.german_term,
    article             = excluded.article,
    plural_form         = excluded.plural_form,
    category            = excluded.category,
    profession_id       = excluded.profession_id,
    priority            = excluded.priority,
    frequency           = excluded.frequency,
    verification_status = excluded.verification_status,
    source_ref          = excluded.source_ref,
    notes               = excluded.notes
  returning id, external_id
)
insert into vocabulary_translations (vocabulary_item_id, language_code, term)
select up.id, 'ru', s.russian from up join src s on s.external_id = up.external_id
on conflict (vocabulary_item_id, language_code) do update set term = excluded.term;
"""

# ------------------------------------------------- 3. LESSONS + MAP + NV ---
lrows, maprows = [], []
order = 43  # existing lessons occupy order_index 1..43
for _, r in les.iterrows():
    order += 1
    lrows.append('  (' + ','.join([
        q(r.LESSON_ID), q(str(r.LESSON_ID).lower()), q(r.TITLE),
        q(MODSLUG[r.MODULE]), str(order), q(r.MODULE), q(r.REAL_WORLD_OUTCOME),
    ]) + ')')
    for i, pid in enumerate([s.strip() for s in str(r.PHRASE_IDS).split(',')], start=1):
        maprows.append(f'  ({q(r.LESSON_ID)},{q(pid)},{i})')

nvrows = []
for _, r in nv.iterrows():
    nvrows.append('  (' + ','.join([
        q('NV-' + str(r.CANONICAL_ID)), q(r.CANONICAL_ID), q(r.VARIANT_ID),
        q(r.VARIANT_GERMAN), q(r.VARIANT_RUSSIAN),
    ]) + ')')

lessons_sql = f"""-- MOVA content candidate: 14 new lessons, their 121 phrase links and the one
-- new natural-variant family. Lessons enter is_published = false: their
-- phrases are not approved yet, so a published lesson would render empty.
-- One statement flips both when review is done (see promote script).
with src (external_id, slug, title, module_slug, ord, track, outcome) as (values
{",\n".join(lrows)}
), up as (
  insert into lessons (external_id, module_id, slug, kind, order_index,
                       est_minutes, is_published, track, content_module, outcome, notes)
  select s.external_id, m.id, s.slug, 'mixed', s.ord, 10, false, s.track, s.track,
         s.outcome, 'CONTENT_CANDIDATE: ждёт native + Facharbeiter review'
  from src s join modules m on m.slug = s.module_slug
  on conflict (external_id) do update set
    module_id      = excluded.module_id,
    slug           = excluded.slug,
    order_index    = excluded.order_index,
    track          = excluded.track,
    content_module = excluded.content_module,
    outcome        = excluded.outcome,
    notes          = excluded.notes
  returning id, external_id
)
insert into lesson_translations (lesson_id, language_code, title, goal)
select up.id, 'ru', s.title, s.outcome from up join src s on s.external_id = up.external_id
on conflict (lesson_id, language_code) do update set
  title = excluded.title, goal = excluded.goal;

-- lesson_phrases: every new phrase is taught material, so role = 'primary'.
with m (lesson_ext, phrase_ext, ord) as (values
{",\n".join(maprows)}
)
insert into lesson_phrases (lesson_id, phrase_id, order_index, role)
select l.id, p.id, m.ord, 'primary'
from m join lessons l on l.external_id = m.lesson_ext
       join phrases p on p.external_id = m.phrase_ext
on conflict (lesson_id, phrase_id) do update set
  order_index = excluded.order_index, role = excluded.role;

-- NATURAL_VARIANTS: one canonical/variant pair, registers 2 and 3.
with nv (fam_ext, canonical_ext, variant_ext, variant_de, variant_ru) as (values
{",\n".join(nvrows)}
), fam as (
  insert into phrase_families (external_id, key, intent, kind, content_module,
                               profession_id, status, source_ref)
  select nv.fam_ext, nv.fam_ext, 'natural_variant_pair', 'natural_variant',
         p.content_module, p.profession_id, 'native_review', 'MOVA_MASTER_CONTENT.xlsx'
  from nv join phrases p on p.external_id = nv.canonical_ext
  on conflict (external_id) do update set status = excluded.status
  returning id, external_id
), tr as (
  insert into phrase_family_translations (family_id, language_code, meaning)
  select fam.id, 'ru', nv.variant_ru from fam join nv on nv.fam_ext = fam.external_id
  on conflict (family_id, language_code) do update set meaning = excluded.meaning
  returning family_id
)
insert into phrase_family_variants (family_id, register_level, german_text)
select fam.id, v.lvl, v.de
from fam join nv on nv.fam_ext = fam.external_id
     join phrases c on c.external_id = nv.canonical_ext
     cross join lateral (values (2, c.german_text), (3, nv.variant_de)) as v(lvl, de)
on conflict (family_id, register_level) do update set german_text = excluded.german_text;
"""

import os
os.makedirs(OUT, exist_ok=True)
for name, sql in [('01_phrases.sql', phrases_sql), ('02_vocabulary.sql', vocab_sql),
                  ('03_lessons.sql', lessons_sql)]:
    open(f'{OUT}/{name}', 'w').write(sql)
    print(name, len(sql), 'bytes')
print('phrases', len(rows), 'vocab', len(vrows), 'lessons', len(lrows),
      'links', len(maprows), 'variants', len(nvrows))
