import type { Locale } from './locale';

/**
 * Landing/funnel copy, per locale. This is a small hand-written dictionary,
 * not an i18n library — the marketing surface is a handful of screens, and a
 * library would be scope the brief explicitly warns against ("do not add
 * dependencies without clear justification").
 *
 * Russian is the reviewed, primary copy. Ukrainian is authored by the same
 * process as the diagnostic draft translations: written for this task, not
 * reviewed by a native speaker. `uk.reviewed` stays false until someone
 * actually reviews it — nothing in the app is allowed to flip it silently.
 */

export type LandingCopy = {
  reviewed: boolean;
  brand: string;
  heroKicker: string;
  heroTitle: string;
  heroSub: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroFootnote: string;
  momentTitle: string;
  momentPrompt: string;
  momentPlay: string;
  momentCorrect: string;
  momentIncorrect: string;
  momentFootnote: string;
  momentCta: string;
  recognitionTitle: string;
  recognitionItems: string[];
  recognitionFootnote: string;
  showcaseTitle: string;
  showcaseSteps: { title: string; detail: string }[];
  showcaseCta: string;
  translatorTitle: string;
  translatorTranslatorLabel: string;
  translatorTranslatorText: string;
  translatorMovaLabel: string;
  translatorMovaText: string;
  beforeAfterTitle: string;
  beforeAfterForeman: string;
  beforeLabel: string;
  beforeText: string;
  afterLabel: string;
  afterText: string;
  beforeAfterFootnote: string;
  scopeTitle: string;
  scopeLessons: string;
  scopePhrases: string;
  scopeVocab: string;
  scopeFootnote: string;
  offerTitle: string;
  offerEdition: string;
  offerIncludes: string[];
  offerCta: string;
  offerPriceUnset: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
  finalTitle: string;
  finalSub: string;
  finalCta: string;
  footerDisclaimer: string;
  footerLogin: string;
  stickyTest: string;
  stickyOffer: string;
};

const ru: LandingCopy = {
  reviewed: true,
  brand: 'MOVA',
  heroKicker: 'MOVA',
  heroTitle: 'Работаешь на стройке в Германии?\nПонимай, что говорит прораб.',
  heroSub:
    'Практический немецкий для работы: команды, материалы, инструменты и реальные ситуации на объекте.',
  heroCtaPrimary: 'Проверить себя бесплатно',
  heroCtaSecondary: 'Посмотреть, как работает MOVA',
  heroFootnote: '7 команд · около 2 минут · без регистрации',
  momentTitle: 'Что сказал прораб?',
  momentPrompt: 'Прослушай — и выбери, что это значит',
  momentPlay: 'Слушать',
  momentCorrect: 'Верно. Это была простая команда.',
  momentIncorrect: 'Не совсем.',
  momentFootnote: 'Немецкий покажем после ответа — сначала попробуй на слух.',
  momentCta: 'Пройти тест из 7 команд',
  recognitionTitle: 'На объекте немецкий звучит иначе',
  recognitionItems: [
    'Знаешь слово Wand — но пропустил, ЧТО с ней нужно сделать.',
    'Понял zwei Platten — но не понял, ОТКУДА их принести.',
    'Понял morgen — но не понял, К КАКОМУ времени.',
  ],
  recognitionFootnote:
    'Отдельные слова не складываются в инструкцию. Живая речь звучит быстрее и иначе, чем в учебнике.',
  showcaseTitle: 'Так это работает',
  showcaseSteps: [
    { title: 'Слушаешь', detail: 'Настоящую команду с объекта' },
    { title: 'Выбираешь значение', detail: 'И сразу видишь, понял ли верно' },
    { title: 'Слышишь ещё раз', detail: 'Пока не станет привычным' },
    { title: 'Возвращаешься к сложному', detail: 'То, в чём ошибся, приходит снова' },
  ],
  showcaseCta: 'Проверить, сколько поймёшь ты',
  translatorTitle: 'Чем это отличается от переводчика',
  translatorTranslatorLabel: 'Переводчик',
  translatorTranslatorText: 'Помогает, когда у тебя уже есть время ввести или прочитать фразу.',
  translatorMovaLabel: 'MOVA',
  translatorMovaText: 'Учит понимать команду сразу, пока прораб её произносит — без телефона в руках.',
  beforeAfterTitle: 'Что меняется',
  beforeAfterForeman: 'Mach erst diese Wand fertig.',
  beforeLabel: 'Сейчас ты слышишь',
  beforeText: '… Wand … что-то про стену. Какую? Сейчас или потом?',
  afterLabel: 'После MOVA',
  afterText: 'Сначала закончи эту стену — потом остальное.',
  beforeAfterFootnote:
    'MOVA не обещает свободную речь через неделю. Она учит понимать рабочие указания и отвечать в обычных ситуациях на объекте.',
  scopeTitle: 'Что внутри',
  scopeLessons: 'занятий',
  scopePhrases: 'рабочих фраз',
  scopeVocab: 'слов стройки',
  scopeFootnote: 'Фразы взяты из реальной практики на немецких стройках, а не выдуманы для курса.',
  offerTitle: 'Полный доступ',
  offerEdition: 'MOVA — Полный доступ',
  offerIncludes: [
    'Весь курс: команды прораба, инструменты, материалы, размеры',
    'Модули по специальностям, которые есть в курсе',
    'Упражнения на понимание речи на слух',
    'Словарь стройки',
    'Повторение того, что забывается',
    'Доступ с телефона, прогресс сохраняется',
  ],
  offerCta: 'Получить доступ',
  offerPriceUnset: 'Цена уточняется на следующем шаге',
  faqTitle: 'Вопросы',
  faq: [
    {
      q: 'Подойдёт ли мне с нулевым немецким?',
      a: 'Да. Курс начинается с самых коротких команд, которые звучат на объекте каждый день. Грамматику учить не нужно.',
    },
    {
      q: 'Это курс грамматики?',
      a: 'Нет. Ты не разбираешь правила — ты слушаешь фразу, выбираешь значение и сразу видишь, понял ли верно.',
    },
    {
      q: 'Какие специальности есть?',
      a: 'Общая часть нужна всем. После неё открывается модуль твоей специальности из тех, что есть в курсе.',
    },
    {
      q: 'Сколько нужно заниматься?',
      a: 'Занятие рассчитано на 10 минут. Сроков освоения курса мы не обещаем — это зависит от тебя.',
    },
    {
      q: 'Нужно устанавливать приложение?',
      a: 'Нет. MOVA открывается в браузере телефона. Добавить её на главный экран можно после начала занятий.',
    },
    {
      q: 'Смогу ли я пользоваться с телефона?',
      a: 'Да, это основной способ. Крупный текст, большие кнопки, короткие занятия — для перерыва на объекте.',
    },
    {
      q: 'Как я получу доступ после оплаты?',
      a: 'Через личный аккаунт — вход по почте и паролю, курс открывается сразу после оформления.',
    },
  ],
  finalTitle: 'Проверь, насколько хорошо ты понимаешь немецкий на стройке',
  finalSub: 'Семь настоящих команд прораба. Две минуты. Без регистрации.',
  finalCta: 'Пройти бесплатный тест',
  footerDisclaimer:
    'MOVA — языковой тренажёр. Он не заменяет инструктаж по безопасности от работодателя, профессиональное обучение и требования BG BAU.',
  footerLogin: 'Войти',
  stickyTest: 'Проверить себя',
  stickyOffer: 'Получить MOVA',
};

/**
 * Ukrainian — draft, unreviewed. `reviewed: false` is load-bearing: the UI
 * renders a small notice wherever this copy is shown, and no script in this
 * repository is permitted to flip it.
 */
const uk: LandingCopy = {
  ...ru,
  reviewed: false,
  heroTitle: 'Працюєш на будівництві в Німеччині?\nРозумій, що каже прораб.',
  heroSub:
    'Практична німецька для роботи: команди, матеріали, інструменти та реальні ситуації на об’єкті.',
  heroCtaPrimary: 'Перевір себе безкоштовно',
  heroCtaSecondary: 'Подивитись, як працює MOVA',
  heroFootnote: '7 команд · близько 2 хвилин · без реєстрації',
  momentTitle: 'Що сказав прораб?',
  momentPrompt: 'Прослухай — і обери, що це означає',
  momentPlay: 'Слухати',
  momentCorrect: 'Правильно. Це була проста команда.',
  momentIncorrect: 'Не зовсім.',
  momentFootnote: 'Німецьку покажемо після відповіді — спершу спробуй на слух.',
  momentCta: 'Пройти тест із 7 команд',
  recognitionTitle: 'На об’єкті німецька звучить інакше',
  recognitionItems: [
    'Знаєш слово Wand — але пропустив, ЩО з нею треба зробити.',
    'Зрозумів zwei Platten — але не зрозумів, ЗВІДКИ їх принести.',
    'Зрозумів morgen — але не зрозумів, ДО ЯКОГО часу.',
  ],
  recognitionFootnote:
    'Окремі слова не складаються в інструкцію. Жива мова звучить швидше і інакше, ніж у підручнику.',
  showcaseTitle: 'Ось як це працює',
  showcaseCta: 'Перевірити, скільки зрозумієш ти',
  translatorTitle: 'Чим це відрізняється від перекладача',
  translatorTranslatorLabel: 'Перекладач',
  translatorTranslatorText: 'Допомагає, коли в тебе вже є час ввести або прочитати фразу.',
  translatorMovaLabel: 'MOVA',
  translatorMovaText: 'Вчить розуміти команду одразу, поки прораб її вимовляє — без телефону в руках.',
  beforeAfterTitle: 'Що змінюється',
  beforeLabel: 'Зараз ти чуєш',
  beforeText: '… Wand … щось про стіну. Яку? Зараз чи потім?',
  afterLabel: 'Після MOVA',
  afterText: 'Спочатку закінчи цю стіну — потім решту.',
  beforeAfterFootnote:
    'MOVA не обіцяє вільну мову за тиждень. Вона вчить розуміти робочі вказівки та відповідати у звичних ситуаціях на об’єкті.',
  scopeTitle: 'Що всередині',
  scopeLessons: 'занять',
  scopePhrases: 'робочих фраз',
  scopeVocab: 'слів будівництва',
  scopeFootnote: 'Фрази взяті з реальної практики на німецьких будівництвах, а не вигадані для курсу.',
  offerTitle: 'Повний доступ',
  offerEdition: 'MOVA — Повний доступ',
  offerCta: 'Отримати доступ',
  offerPriceUnset: 'Ціна уточнюється на наступному кроці',
  faqTitle: 'Питання',
  finalTitle: 'Перевір, наскільки добре ти розумієш німецьку на будівництві',
  finalSub: 'Сім справжніх команд прораба. Дві хвилини. Без реєстрації.',
  finalCta: 'Пройти безкоштовний тест',
  footerDisclaimer:
    'MOVA — мовний тренажер. Він не замінює інструктаж з безпеки від роботодавця, професійне навчання та вимоги BG BAU.',
  footerLogin: 'Увійти',
  stickyTest: 'Перевірити себе',
  stickyOffer: 'Отримати MOVA',
};

export const LANDING_COPY: Record<Locale, LandingCopy> = { ru, uk };
