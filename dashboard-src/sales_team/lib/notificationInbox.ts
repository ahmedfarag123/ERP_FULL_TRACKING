import { supabase } from './supabase';
import type { Notification } from '../types';

function toNotificationType(value: unknown) {
  if (value === 'order' || value === 'customer' || value === 'alert' || value === 'sync' || value === 'system') {
    return value;
  }
  if (value === 'delivery') return 'order';
  return 'system';
}

export async function fetchSalesNotifications(limit = 50): Promise<Notification[]> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) return [];

  const { data: recipients, error: recipientsError } = await supabase
    .from('notification_recipients')
    .select('notification_id, read_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (recipientsError) throw new Error(recipientsError.message);

  const recipientRows = recipients ?? [];
  const ids = recipientRows.map((row) => row.notification_id).filter((value): value is string => Boolean(value));
  if (ids.length === 0) return [];

  const { data: notifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('id, title, body, sent_at, metadata')
    .in('id', ids)
    .order('sent_at', { ascending: false });

  if (notificationsError) throw new Error(notificationsError.message);

  const readById = new Map(recipientRows.map((row) => [String(row.notification_id), row.read_at ?? null]));

  return (notifications ?? []).map((notification) => {
    const metadata = (notification.metadata ?? {}) as Record<string, unknown>;
    return {
      id: String(notification.id),
      type: toNotificationType(metadata.type),
      title: String(notification.title),
      message: String(notification.body),
      created_at: String(notification.sent_at),
      read: Boolean(readById.get(String(notification.id))),
      metadata,
    };
  });
}

export async function markSalesNotificationRead(notificationId: string) {
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });

  if (error) throw new Error(error.message);
}
