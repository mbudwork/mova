import { describe, expect, it } from 'vitest';
import { plural, withPlural, FORMS } from './plural';

describe('склонение при числе', () => {
  it('берёт первую форму для 1, 21, 101', () => {
    for (const n of [1, 21, 101, 1001]) {
      expect(plural(n, FORMS.lesson)).toBe('урок');
    }
  });

  it('берёт вторую форму для 2–4, 22–24', () => {
    for (const n of [2, 3, 4, 22, 33, 104]) {
      expect(plural(n, FORMS.lesson)).toBe('урока');
    }
  });

  /**
   * Главная ловушка русского счёта: 11–14 идут по третьей форме, хотя
   * последняя цифра говорит об обратном. Именно на ней ломаются самописные
   * варианты — «11 урок», «12 урока».
   */
  it('берёт третью форму для 11–14 вопреки последней цифре', () => {
    for (const n of [11, 12, 13, 14, 111, 112]) {
      expect(plural(n, FORMS.lesson)).toBe('уроков');
    }
  });

  it('берёт третью форму для 0, 5–20', () => {
    for (const n of [0, 5, 9, 15, 20]) {
      expect(plural(n, FORMS.lesson)).toBe('уроков');
    }
  });

  it('склеивает число со словом', () => {
    expect(withPlural(4, FORMS.lesson)).toBe('4 урока');
    expect(withPlural(1, FORMS.phrase)).toBe('1 фраза');
    expect(withPlural(157, FORMS.phrase)).toBe('157 фраз');
  });
});
