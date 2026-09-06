-- MOVA content candidate: 14 new lessons, their 121 phrase links and the one
-- new natural-variant family. Lessons enter is_published = false: their
-- phrases are not approved yet, so a published lesson would render empty.
-- One statement flips both when review is done (see promote script).
with src (external_id, slug, title, module_slug, ord, track, outcome) as (values
  ('C27','c27','Возьми, дай, неси, держи','core',44,'CORE','см. CONTENT_EXPANSION_REPORT.md'),
  ('C28','c28','Помещения и этажи','core',45,'CORE','см. CONTENT_EXPANSION_REPORT.md'),
  ('C29','c29','Сдача работы и формальное обращение','core',46,'CORE','см. CONTENT_EXPANSION_REPORT.md'),
  ('T11','t11','Trockenbau: разметка, инструмент, координация','trockenbau',47,'trockenbau','см. CONTENT_EXPANSION_REPORT.md'),
  ('F11','f11','Fliesenleger: инструмент и разметка раскладки','fliesen',48,'fliesenleger','см. CONTENT_EXPANSION_REPORT.md'),
  ('M10','m10','Maler: обои — подготовка и поклейка','maler',49,'maler','см. CONTENT_EXPANSION_REPORT.md'),
  ('M11','m11','Maler: распыление, высота, цвет','maler',50,'maler','см. CONTENT_EXPANSION_REPORT.md'),
  ('MR10','mr10','Maurer: леса и подача материала','maurer',51,'maurer','см. CONTENT_EXPANSION_REPORT.md'),
  ('E12','e12','Elektriker: сверление и штробление','elektro',52,'elektriker','см. CONTENT_EXPANSION_REPORT.md'),
  ('E13','e13','Elektriker: измерение и проверка','elektro',53,'elektriker','см. CONTENT_EXPANSION_REPORT.md'),
  ('E14','e14','Elektriker: заземление, фаза-ноль, схемы','elektro',54,'elektriker','см. CONTENT_EXPANSION_REPORT.md'),
  ('E15','e15','Elektriker: пять правил безопасности (recognition)','elektro',55,'elektriker','см. CONTENT_EXPANSION_REPORT.md'),
  ('S11','s11','SHK: инструмент и другие приборы','shk',56,'sanitaer','см. CONTENT_EXPANSION_REPORT.md'),
  ('S12','s12','SHK: газобезопасность (recognition)','shk',57,'sanitaer','см. CONTENT_EXPANSION_REPORT.md')
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
  ('C27','N-CORE-001',1),
  ('C27','N-CORE-002',2),
  ('C27','N-CORE-003',3),
  ('C27','N-CORE-004',4),
  ('C27','N-CORE-005',5),
  ('C27','N-CORE-006',6),
  ('C27','N-CORE-007',7),
  ('C27','N-CORE-008',8),
  ('C27','N-CORE-009',9),
  ('C27','N-CORE-010',10),
  ('C27','N-CORE-011',11),
  ('C27','N-CORE-012',12),
  ('C28','N-CORE-013',1),
  ('C28','N-CORE-014',2),
  ('C28','N-CORE-015',3),
  ('C28','N-CORE-016',4),
  ('C28','N-CORE-017',5),
  ('C28','N-CORE-018',6),
  ('C28','N-CORE-019',7),
  ('C28','N-CORE-020',8),
  ('C29','N-CORE-021',1),
  ('C29','N-CORE-022',2),
  ('C29','N-CORE-023',3),
  ('C29','N-CORE-024',4),
  ('C29','N-CORE-025',5),
  ('C29','N-CORE-026',6),
  ('C29','N-CORE-027',7),
  ('C29','N-CORE-028',8),
  ('C29','N-CORE-029',9),
  ('T11','N-TB-001',1),
  ('T11','N-TB-002',2),
  ('T11','N-TB-003',3),
  ('T11','N-TB-004',4),
  ('T11','N-TB-005',5),
  ('T11','N-TB-006',6),
  ('T11','N-TB-007',7),
  ('T11','N-TB-008',8),
  ('T11','N-TB-009',9),
  ('T11','N-TB-010',10),
  ('T11','N-TB-011',11),
  ('T11','N-TB-012',12),
  ('F11','N-FL-001',1),
  ('F11','N-FL-002',2),
  ('F11','N-FL-003',3),
  ('F11','N-FL-004',4),
  ('F11','N-FL-005',5),
  ('M10','N-MA-001',1),
  ('M10','N-MA-002',2),
  ('M10','N-MA-003',3),
  ('M10','N-MA-004',4),
  ('M10','N-MA-005',5),
  ('M10','N-MA-006',6),
  ('M10','N-MA-007',7),
  ('M10','N-MA-008',8),
  ('M10','N-MA-009',9),
  ('M10','N-MA-010',10),
  ('M10','N-MA-011',11),
  ('M10','N-MA-012',12),
  ('M11','N-MA-013',1),
  ('M11','N-MA-014',2),
  ('M11','N-MA-015',3),
  ('M11','N-MA-016',4),
  ('M11','N-MA-017',5),
  ('M11','N-MA-018',6),
  ('MR10','N-MR-001',1),
  ('MR10','N-MR-002',2),
  ('MR10','N-MR-003',3),
  ('MR10','N-MR-004',4),
  ('MR10','N-MR-005',5),
  ('MR10','N-MR-006',6),
  ('MR10','N-MR-007',7),
  ('MR10','N-MR-008',8),
  ('MR10','N-MR-009',9),
  ('MR10','N-MR-010',10),
  ('E12','N-EL-001',1),
  ('E12','N-EL-002',2),
  ('E12','N-EL-003',3),
  ('E12','N-EL-004',4),
  ('E12','N-EL-005',5),
  ('E12','N-EL-006',6),
  ('E12','N-EL-007',7),
  ('E13','N-EL-008',1),
  ('E13','N-EL-009',2),
  ('E13','N-EL-010',3),
  ('E13','N-EL-011',4),
  ('E13','N-EL-012',5),
  ('E13','N-EL-013',6),
  ('E13','N-EL-014',7),
  ('E13','N-EL-015',8),
  ('E14','N-EL-016',1),
  ('E14','N-EL-017',2),
  ('E14','N-EL-018',3),
  ('E14','N-EL-019',4),
  ('E14','N-EL-020',5),
  ('E14','N-EL-021',6),
  ('E14','N-EL-022',7),
  ('E14','N-EL-023',8),
  ('E15','N-EL-024',1),
  ('E15','N-EL-025',2),
  ('E15','N-EL-026',3),
  ('E15','N-EL-027',4),
  ('E15','N-EL-028',5),
  ('E15','N-EL-029',6),
  ('E15','N-EL-030',7),
  ('E15','N-EL-031',8),
  ('S11','N-SHK-001',1),
  ('S11','N-SHK-002',2),
  ('S11','N-SHK-003',3),
  ('S11','N-SHK-004',4),
  ('S11','N-SHK-005',5),
  ('S11','N-SHK-006',6),
  ('S11','N-SHK-007',7),
  ('S11','N-SHK-008',8),
  ('S11','N-SHK-009',9),
  ('S11','N-SHK-010',10),
  ('S12','N-SHK-011',1),
  ('S12','N-SHK-012',2),
  ('S12','N-SHK-013',3),
  ('S12','N-SHK-014',4),
  ('S12','N-SHK-015',5),
  ('S12','N-SHK-016',6)
)
insert into lesson_phrases (lesson_id, phrase_id, order_index, role)
select l.id, p.id, m.ord, 'primary'
from m join lessons l on l.external_id = m.lesson_ext
       join phrases p on p.external_id = m.phrase_ext
on conflict (lesson_id, phrase_id) do update set
  order_index = excluded.order_index, role = excluded.role;

-- NATURAL_VARIANTS: one canonical/variant pair, registers 2 and 3.
with nv (fam_ext, canonical_ext, variant_ext, variant_de, variant_ru) as (values
  ('NV-N-CORE-001','N-CORE-001','N-CORE-002','Nimm das mal kurz.','Возьми это на минутку.')
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
