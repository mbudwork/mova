-- =============================================================================
-- MOVA — публикация CONTENT_CANDIDATE после ревью
--
-- НЕ ПРИМЕНЁН. Это то, что запускается ПОСЛЕ того, как native reviewer и
-- Facharbeiter закрыли свои списки (NATIVE_REVIEW_LIST_V2.md,
-- CONTENT_FREEZE_CHECKLIST.md). До этого момента 121 фраза, 53 слова и
-- 14 уроков лежат в базе, но не видны ни одному пользователю.
--
-- Порядок важен: сначала фразы становятся approved, только потом уроки
-- становятся published. Наоборот — и урок отрендерится пустым, потому что
-- политика phrases_read пропускает только approved.
-- =============================================================================

begin;

-- ---------------------------------------------------------------- ШАГ 1 ----
-- Обычные фразы: native_review -> approved.
-- 107 строк. Safety-фразы этот шаг НЕ трогает — у них отдельный шаг 2.
update phrases
   set verification_status = 'approved'
 where external_id like 'N-%'
   and verification_status = 'native_review';

-- ---------------------------------------------------------------- ШАГ 2 ----
-- Safety-фразы (VDE 0105-100 + газобезопасность): 14 строк.
-- Ограничение phrases_safety_ck не даст пометить их approved, пока
-- safety_approved = false, поэтому оба поля выставляются одним update.
--
-- РАСКОММЕНТИРОВАТЬ ТОЛЬКО ПОСЛЕ отдельного safety review. Это тот самый
-- контент, где ошибка перевода стоит дороже всего остального курса вместе
-- взятого: "Es ist spannungsfrei", "Dreh den Haupthahn zu", "Schalt kein
-- Licht ein". Все они recognition-only — рабочий их СЛЫШИТ, а не выполняет.
--
-- update phrases
--    set safety_approved     = true,
--        verification_status = 'approved'
--  where external_id like 'N-%'
--    and verification_status = 'safety_review';

-- ---------------------------------------------------------------- ШАГ 3 ----
-- Словарь: 53 строки. vocabulary_read требует approved И has_full_access().
update vocabulary_items
   set verification_status = 'approved'
 where verification_status = 'native_review'
   and source_ref = 'MOVA_MASTER_CONTENT.xlsx';

-- ---------------------------------------------------------------- ШАГ 4 ----
-- Уроки. Публикуется только тот урок, у которого ВСЕ primary-фразы уже
-- approved — поэтому если шаг 2 остался закомментированным, E15 и S12
-- останутся неопубликованными, и это правильное поведение, а не сбой.
update lessons l
   set is_published = true,
       notes        = null
 where l.external_id in ('C27','C28','C29','T11','F11','M10','M11','MR10',
                         'E12','E13','E14','E15','S11','S12')
   and not exists (
     select 1
       from lesson_phrases lp
       join phrases p on p.id = lp.phrase_id
      where lp.lesson_id = l.id
        and lp.role = 'primary'
        and p.verification_status <> 'approved'
   );

-- ---------------------------------------------------------------- ШАГ 5 ----
-- Семейство natural variants (N-CORE-001 / N-CORE-002).
update phrase_families
   set status = 'approved'
 where external_id like 'NV-%'
   and status = 'native_review';

-- ------------------------------------------------------------- ПРОВЕРКА ----
-- Ожидаемо после полного прогона (все 5 шагов, шаг 2 раскомментирован):
--   phrases_approved   = 525   (404 + 121)
--   vocab_approved     = 370   (317 + 53)
--   lessons_published  =  57   ( 43 + 14)
-- Если шаг 2 пропущен: 511 / 370 / 55.
select (select count(*) from phrases where verification_status = 'approved') as phrases_approved,
       (select count(*) from vocabulary_items where verification_status = 'approved') as vocab_approved,
       (select count(*) from lessons where is_published) as lessons_published,
       (select string_agg(external_id, ', ' order by external_id)
          from lessons
         where not is_published) as still_unpublished;

-- Убедитесь, что числа те, которых вы ждёте, и только потом:
-- commit;
rollback;
