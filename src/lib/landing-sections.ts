import type { Locale } from '@/lib/locale';

/**
 * Тексты секций лендинга — ровно те, что в макете
 * mova-landing-v4-premium-preview.html.
 *
 * Отдельный файл, а не расширение LANDING_COPY: там лежит копирайт, на
 * который завязаны тесты и старые компоненты, и раздувать его структурной
 * разметкой страницы значило бы смешать «что мы говорим» и «как устроен
 * экран». Здесь второе.
 */
export type LandingSections = {
  navCta: string;
  navLogin: string;

  lossEyebrow: string;
  lossTitle: string;
  lossBubblePre: string;
  lossBubbleKnown1: string;
  lossBubbleKnown2: string;
  lossBubbleCaption: string;
  lossDecomp: { label: string; word: string }[];
  lossNote: string;

  pathEyebrow: string;
  pathTitle: string;
  pathSub: string;
  pathProfessions: string[];
  pathCore: string;
  pathProf: string;
  pathTotalCaption: string;
  pathCta: string;

  repeatEyebrow: string;
  repeatTitle: string;
  repeatSub: string;
  repeatStates: string[];

  resultEyebrow: string;
  resultTitle: string;
  resultForemanTag: string;
  resultForeman: string;
  resultBeforeTag: string;
  resultBefore: string;
  resultAfterTag: string;
  resultAfter: string;
  resultNote: string;

  insideEyebrow: string;
  insideTitle: string;
  insideStats: { value: string; caption: string }[];

  priceEyebrow: string;
  priceTitle: string;
  priceProduct: string;
  priceNote: string;
  priceList: string[];
  priceCta: string;
  priceDoubt: string;
  priceDoubtCta: string;

  faqEyebrow: string;
  faqTitle: string;

  finalEyebrow: string;
  finalTitle: string;
  finalSub: string;
  finalCta: string;
  finalNote: string;

  footerDisclaimer: string;
  footerTerms: string;
  footerRefund: string;
  footerCookies: string;
  footerPrivacy: string;
  footerContact: string;
  footerTest: string;
};

const RU: LandingSections = {
  navCta: 'Тест бесплатно',
  navLogin: 'Войти',

  lossEyebrow: 'Почему ты теряешь смысл',
  lossTitle: 'Знать слово мало — нужно поймать команду целиком.',
  lossBubblePre: '„',
  lossBubbleKnown1: 'Wand',
  lossBubbleKnown2: 'fertig',
  lossBubbleCaption: 'так это звучит, когда ты ловишь только знакомые слова',
  lossDecomp: [
    { label: 'действие', word: 'Mach' },
    { label: 'порядок', word: 'erst' },
    { label: 'объект', word: 'diese Wand' },
    { label: 'результат', word: 'fertig' },
  ],
  lossNote:
    'MOVA тренирует слышать структуру целиком — не отдельные знакомые слова, а всю рабочую команду.',

  pathEyebrow: 'Твой путь',
  pathTitle: '232 CORE + твоя профессия.',
  pathSub:
    'Сначала общий язык стройки. Потом — только то, что говорят именно на твоём объекте.',
  pathProfessions: [
    'Trockenbau',
    'Fliesenleger',
    'Maler',
    'Maurer',
    'Elektriker',
    'Sanitär / SHK',
  ],
  pathCore: 'CORE',
  pathProf: 'профессия',
  pathTotalCaption: 'релевантных рабочих фраз для твоей профессии',
  pathCta: 'Это мой путь MOVA',

  repeatEyebrow: 'Умное повторение',
  repeatTitle: 'Ошибаешься — MOVA возвращает фразу чаще.',
  repeatSub:
    'Понимаешь уверенно — она появляется реже. Не картотека карточек, а система, которая замечает, где ты спотыкаешься.',
  repeatStates: ['Слабо', 'Учится', 'Понимает', 'Уверенно'],

  resultEyebrow: 'Реальный результат',
  resultTitle: 'Не магия. Просто понимаешь больше.',
  resultForemanTag: 'Прораб говорит',
  resultForeman: '„Bring mir noch zwei Platten von oben.“',
  resultBeforeTag: 'Сейчас ты слышишь',
  resultBefore: '„… zwei Platten … ???“',
  resultAfterTag: 'После MOVA',
  resultAfter: '«Принеси ещё две плиты сверху.»',
  resultNote:
    'MOVA не обещает магию. Она тренирует именно этот навык — узнавать структуру команды быстрее.',

  insideEyebrow: 'Что внутри',
  insideTitle: 'Полноценная база, не десяток фраз.',
  insideStats: [
    { value: '544+', caption: 'рабочих фраз' },
    { value: '232', caption: 'CORE' },
    { value: '6', caption: 'профессий' },
    { value: '5–10', caption: 'минут на подход' },
  ],

  priceEyebrow: 'Полный доступ',
  priceTitle: 'Меньше, чем кажется — больше, чем ожидаешь.',
  priceProduct: 'MOVA — Full Access',
  priceNote: 'Одноразовая оплата. Без подписки.',
  priceList: [
    '232 CORE-фразы — общий язык стройки',
    'Модуль твоей профессии',
    '544+ фраз в общей базе',
    'Тренировка понимания на слух',
    'Умное повторение слабых мест',
    'Прогресс сохраняется, доступ с телефона',
  ],
  priceCta: 'Получить MOVA',
  priceDoubt: 'Сначала не уверен?',
  priceDoubtCta: 'Пройди 7 команд бесплатно',

  faqEyebrow: 'Вопросы',
  faqTitle: 'Коротко о главном.',

  finalEyebrow: 'Завтра на объекте',
  finalTitle: 'Завтра прораб скажет это ещё раз.',
  finalSub:
    'Вопрос только в том, поймёшь ли ты. Проверь прямо сейчас — без текста и переводчика.',
  finalCta: 'Проверить себя бесплатно',
  finalNote: '≈2 минуты · без регистрации',

  footerDisclaimer:
    'MOVA — языковой тренажёр. Не заменяет профессиональную квалификацию, Sicherheitsunterweisung и официальный инструктаж по охране труда.',
  footerTerms: 'Условия',
  footerRefund: 'Возврат',
  footerCookies: 'Cookies',
  footerPrivacy: 'Конфиденциальность',
  footerContact: 'Контакты',
  footerTest: 'Пройти бесплатный тест',
};

const UK: LandingSections = {
  ...RU,
  navCta: 'Тест безкоштовно',
  navLogin: 'Увійти',

  lossEyebrow: 'Чому ти губиш зміст',
  lossTitle: 'Знати слово замало — треба впіймати команду цілком.',
  lossBubbleCaption: 'так це звучить, коли ти ловиш лише знайомі слова',
  lossDecomp: [
    { label: 'дія', word: 'Mach' },
    { label: 'порядок', word: 'erst' },
    { label: 'обʼєкт', word: 'diese Wand' },
    { label: 'результат', word: 'fertig' },
  ],
  lossNote:
    'MOVA тренує чути структуру цілком — не окремі знайомі слова, а всю робочу команду.',

  pathEyebrow: 'Твій шлях',
  pathTitle: '232 CORE + твоя професія.',
  pathSub: 'Спершу спільна мова будівництва. Потім — те, що кажуть саме на твоєму обʼєкті.',
  pathProf: 'професія',
  pathTotalCaption: 'релевантних робочих фраз для твоєї професії',
  pathCta: 'Це мій шлях MOVA',

  repeatEyebrow: 'Розумне повторення',
  repeatTitle: 'Помиляєшся — MOVA повертає фразу частіше.',
  repeatSub:
    'Розумієш упевнено — вона зʼявляється рідше. Не картотека карток, а система, яка помічає, де ти спотикаєшся.',
  repeatStates: ['Слабко', 'Вчиться', 'Розуміє', 'Упевнено'],

  resultEyebrow: 'Реальний результат',
  resultTitle: 'Не магія. Просто розумієш більше.',
  resultForemanTag: 'Прораб каже',
  resultBeforeTag: 'Зараз ти чуєш',
  resultAfterTag: 'Після MOVA',
  resultAfter: '«Принеси ще дві плити зверху.»',
  resultNote:
    'MOVA не обіцяє магії. Вона тренує саме цю навичку — упізнавати структуру команди швидше.',

  insideEyebrow: 'Що всередині',
  insideTitle: 'Повноцінна база, не десяток фраз.',
  insideStats: [
    { value: '544+', caption: 'робочих фраз' },
    { value: '232', caption: 'CORE' },
    { value: '6', caption: 'професій' },
    { value: '5–10', caption: 'хвилин на підхід' },
  ],

  priceEyebrow: 'Повний доступ',
  priceTitle: 'Менше, ніж здається — більше, ніж очікуєш.',
  priceNote: 'Одноразова оплата. Без підписки.',
  priceList: [
    '232 CORE-фрази — спільна мова будівництва',
    'Модуль твоєї професії',
    '544+ фраз у загальній базі',
    'Тренування розуміння на слух',
    'Розумне повторення слабких місць',
    'Прогрес зберігається, доступ з телефона',
  ],
  priceCta: 'Отримати MOVA',
  priceDoubt: 'Спершу не впевнений?',
  priceDoubtCta: 'Пройди 7 команд безкоштовно',

  faqEyebrow: 'Питання',
  faqTitle: 'Коротко про головне.',

  finalEyebrow: 'Завтра на обʼєкті',
  finalTitle: 'Завтра прораб скаже це ще раз.',
  finalSub: 'Питання лише в тому, чи зрозумієш ти. Перевір просто зараз — без тексту й перекладача.',
  finalCta: 'Перевірити себе безкоштовно',
  finalNote: '≈2 хвилини · без реєстрації',

  footerDisclaimer:
    'MOVA — мовний тренажер. Не замінює професійну кваліфікацію, Sicherheitsunterweisung та офіційний інструктаж з охорони праці.',
  footerTerms: 'Умови',
  footerRefund: 'Повернення',
  footerCookies: 'Cookies',
  footerPrivacy: 'Конфіденційність',
  footerContact: 'Контакти',
  footerTest: 'Пройти безкоштовний тест',
};

export const LANDING_SECTIONS: Record<Locale, LandingSections> = { ru: RU, uk: UK };
