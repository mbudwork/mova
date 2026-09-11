/**
 * Склонение существительного при числе.
 *
 * В русском три формы, и выбор идёт по последним двум цифрам: 1 урок,
 * 2 урока, 5 уроков, но 11 уроков и 21 урок. Подставлять всюду форму
 * множественного числа — «4 уроков», «1 фраз» — дешевле, но читается как
 * машинный перевод, а продукт как раз про язык.
 *
 * Отдельно про 11–14: они всегда берут третью форму, хотя последняя цифра
 * говорит об обратном. Это и есть частая ошибка в самописных вариантах.
 */
export function plural(count: number, forms: [string, string, string]): string {
  const n = Math.abs(count) % 100;
  if (n >= 11 && n <= 14) return forms[2];

  switch (n % 10) {
    case 1:
      return forms[0];
    case 2:
    case 3:
    case 4:
      return forms[1];
    default:
      return forms[2];
  }
}

/** Число вместе со склонённым словом: «4 урока». */
export function withPlural(count: number, forms: [string, string, string]): string {
  return `${count} ${plural(count, forms)}`;
}

export const FORMS = {
  lesson: ['урок', 'урока', 'уроков'] as [string, string, string],
  phrase: ['фраза', 'фразы', 'фраз'] as [string, string, string],
  phraseAcc: ['фразу', 'фразы', 'фраз'] as [string, string, string],
  command: ['команда', 'команды', 'команд'] as [string, string, string],
  profession: ['профессия', 'профессии', 'профессий'] as [string, string, string],
  minute: ['минута', 'минуты', 'минут'] as [string, string, string],
  word: ['слово', 'слова', 'слов'] as [string, string, string],
  weak: ['слабая', 'слабые', 'слабых'] as [string, string, string],
};
