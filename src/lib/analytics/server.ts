import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { FunnelEvent } from '@/lib/analytics/events';
import type { Json } from '@/types/database';

/**
 * Запись события из серверного кода.
 *
 * Клиентский track() отправляет событие из браузера, и для покупки это не
 * годится: подтверждение приходит вебхуком от Stripe, когда вкладка
 * покупателя уже закрыта или он вообще платил с другого устройства. Поэтому
 * purchase_completed мог быть записан только отсюда — и до сих пор не
 * записывался вовсе: в таблице ноль таких событий при трёх оплатах.
 *
 * Никогда не бросает. Это статистика: потерять её неприятно, но уронить
 * из-за неё выдачу доступа нельзя.
 */
export async function trackServer(
  event: FunnelEvent,
  payload: Record<string, Json> = {},
  userId?: string | null,
): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from('analytics_events').insert({
      event_type: event,
      payload,
      user_id: userId ?? null,
    });
  } catch (error) {
    console.error('[analytics] не удалось записать событие', event, error);
  }
}
