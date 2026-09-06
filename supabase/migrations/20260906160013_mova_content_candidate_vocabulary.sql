-- MOVA content candidate: 53 new vocabulary items (VOCABULARY sheet,
-- STATUS = CONTENT_CANDIDATE). Enter native_review, so vocabulary_read RLS
-- (which requires 'approved') keeps them out of the dictionary until reviewed.
with src (external_id, german, russian, article, plural, category, prof_slug,
          priority, freq, example) as (values
  ('C122','die Zange','плоскогубцы/клещи','die','-n','hand tool',null,'B',50,'Nimm die Zange.'),
  ('C123','die Säge','пила','die','-n','hand tool',null,'B',50,'Schneid das mit der Säge.'),
  ('C124','die Schaufel','лопата','die','-n','hand tool',null,'B',50,'Nimm die Schaufel.'),
  ('C125','die Schubkarre','тачка','die','-n','transport',null,'B',50,'Hol die Schubkarre.'),
  ('C126','der Helm','каска','der','-e','PPE',null,'A',80,'Setz den Helm auf.'),
  ('C127','die Schutzbrille','защитные очки','die','-n','PPE',null,'A',80,'Setz die Schutzbrille auf.'),
  ('C128','der Schutzhandschuh','защитная перчатка','der','-e','PPE',null,'A',80,'Zieh die Handschuhe an.'),
  ('C129','der Gehörschutz','защита слуха','der','-e/-schütze','PPE',null,'B',50,'Nimm den Gehörschutz.'),
  ('T197','die Blechschere','ножницы по металлу','die','-n','hand tool','trockenbau','A',80,'Schneid das Profil mit der Blechschere.'),
  ('T198','die Trockenbauzange (Crimperzange)','обжимные клещи для профиля','die','-n','hand tool','trockenbau','B',50,'Nimm die Crimperzange.'),
  ('T199','der Schnellbauschrauber','шуруповёрт для гипсокартона','der',null,'power tool','trockenbau','A',80,'Schraub das mit dem Schnellbauschrauber fest.'),
  ('T200','die Gipskarton-Handsäge','ножовка по гипсокартону','die','-n','hand tool','trockenbau','B',50,'Schneid die Platte mit der Handsäge.'),
  ('T201','der Kreuzlinien-Laser','лазерный уровень','der',null,'measuring','trockenbau','B',50,'Stell den Laser auf.'),
  ('T202','das Formel-Pro Dichtungsband (Anschlussdichtband)','уплотнительная лента','das','-bänder','consumable','trockenbau','B',50,'Kleb das Dichtband auf das Profil.'),
  ('T203','der Nageldübel','дюбель-гвоздь','der',null,'fastener','trockenbau','B',50,'Bohr für den Nageldübel vor.'),
  ('T204','das Armierungsband','армирующая лента','das','-bänder','reinforcement','trockenbau','B',50,'Kleb das Armierungsband auf die Fuge.'),
  ('T205','der Winkelschleifer (mit Diamanttrennscheibe)','болгарка с алмазным диском','der',null,'power tool','fliesenleger','A',80,'Nimm den Winkelschleifer.'),
  ('T206','die Diamantbohrkrone','алмазная коронка','die','-n','power tool accessory','fliesenleger','B',50,'Bohr das Loch mit der Diamantbohrkrone.'),
  ('T207','der Zahnspachtel / die Zahnkelle','зубчатый шпатель/кельма','der','– / -n','hand tool','fliesenleger','A',80,'Zieh den Kleber mit dem Zahnspachtel auf.'),
  ('T208','das Fliesenkreuz','крестик для плитки','das','-e','accessory','fliesenleger','A',80,'Setz die Fliesenkreuze.'),
  ('T209','das Fliesen-Nivelliersystem','система выравнивания плитки','das','-e','accessory','fliesenleger','B',50,'Nimm das Nivelliersystem.'),
  ('T210','das Fugenbrett / der Fugengummi','тёрка для затирки','das','-er / -s','hand tool','fliesenleger','A',80,'Verfug das mit dem Fugenbrett.'),
  ('T211','der Fugenschwamm','губка для швов','der','Fugenschwämme','hand tool','fliesenleger','A',80,'Nimm den Fugenschwamm.'),
  ('T212','der Rührquirl','миксер-насадка','der','-e','power tool accessory','fliesenleger','B',50,'Rühr den Kleber mit dem Quirl an.'),
  ('T213','die Haftbrücke (Haftgrund)','адгезионный грунт','die','-n','prep','fliesenleger','B',50,'Nimm die Haftbrücke für den glatten Untergrund.'),
  ('T214','das Silikon','силикон','das','-e','sealant','fliesenleger','A',80,'Zieh das Silikon in die Ecke.'),
  ('T215','die Fliesenschiene','профиль для кромки плитки','die','-n','trim','fliesenleger','B',50,'Setz die Fliesenschiene an den Rand.'),
  ('T216','der Flächenstreicher','широкая кисть-флейц','der',null,'hand tool','maler','B',50,'Nimm den Flächenstreicher.'),
  ('T217','das Spritzgerät','краскопульт','das','-e','power tool','maler','B',50,'Spritz das mit dem Spritzgerät.'),
  ('T218','die Schleifmaschine / der Schleifklotz','шлифмашина/шлифколодка','die','-n / Schleifklötze','power/hand tool','maler','A',80,'Schleif das mit dem Schleifklotz.'),
  ('T219','der Spachtel','шпатель','der',null,'hand tool','maler','A',80,'Spachtel das Loch zu.'),
  ('T220','die Dispersionsfarbe / Latexfarbe','дисперсионная/латексная краска','die','-n','paint','maler','A',80,'Streich die Wand mit der Dispersionsfarbe.'),
  ('T221','die Tapete','обои','die','-n','material','maler','B',50,'Bring die Tapete.'),
  ('T222','die Fugenkelle','расшивка (кельма для швов)','die','-n','hand tool','maurer','A',80,'Zieh die Fuge mit der Fugenkelle nach.'),
  ('T223','der Maurerhammer','молоток каменщика','der','Maurerhämmer','hand tool','maurer','A',80,'Schlag den Stein mit dem Maurerhammer zurecht.'),
  ('T224','die Richtschnur (Maurerschnur/Schnurgerüst)','шнур для разметки ряда','die','Richtschnüre','measuring','maurer','A',80,'Spann die Richtschnur.'),
  ('T225','das Senklot','отвес','das','-e','measuring','maurer','B',50,'Nimm das Senklot.'),
  ('T226','der Mörtelrührer','миксер для раствора','der',null,'power tool accessory','maurer','B',50,'Rühr den Mörtel mit dem Mörtelrührer an.'),
  ('T227','das Fugeneisen','расшивка швов','das',null,'hand tool','maurer','B',50,'Zieh die Fuge mit dem Fugeneisen ab.'),
  ('T228','der Ziegelstein (Ziegel)','кирпич','der','-e','block','maurer','A',80,'Bring die Ziegelsteine.'),
  ('T229','der Porenbeton','газобетон','der',null,'block','maurer','B',50,'Nimm den Porenbetonstein.'),
  ('T230','der Spannungsprüfer','индикатор напряжения','der',null,'measuring/safety','elektriker','A',80,'Prüf das mit dem Spannungsprüfer.'),
  ('T231','der Seitenschneider','бокорезы','der',null,'hand tool','elektriker','A',80,'Nimm den Seitenschneider.'),
  ('T232','die Abisolierzange','стриппер для изоляции','die','-n','hand tool','elektriker','A',80,'Isolier das Kabel mit der Abisolierzange ab.'),
  ('T233','die Aderendhülsenzange','клещи для гильз','die','-n','hand tool','elektriker','B',50,'Crimp das mit der Aderendhülsenzange.'),
  ('T234','das Multimeter','мультиметр','das',null,'measuring','elektriker','B',50,'Miss das mit dem Multimeter.'),
  ('T235','der Sicherungskasten (Verteiler)','распределительный щиток','der','Sicherungskästen','panel','elektriker','A',80,'Geh zum Sicherungskasten.'),
  ('T236','die Rohrzange','трубный ключ','die','-n','hand tool','sanitaer','A',80,'Nimm die Rohrzange.'),
  ('T237','das Presswerkzeug','пресс-инструмент для фитингов','das','-e','power tool','sanitaer','B',50,'Press das mit dem Presswerkzeug.'),
  ('T238','der Lötbrenner','горелка для пайки','der',null,'hand tool','sanitaer','B',50,'Hol den Lötbrenner.'),
  ('T239','der Gewindeschneider','резьбонарезной инструмент','der',null,'hand tool','sanitaer','B',50,'Schneid das Gewinde mit dem Gewindeschneider.'),
  ('T240','der Rohrschneider','труборез','der',null,'hand tool','sanitaer','A',80,'Schneid das Rohr mit dem Rohrschneider.'),
  ('T241','die Verbindung (Fitting)','фитинг','die','-en','connector','sanitaer','A',80,'Nimm die passende Verbindung.')
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
