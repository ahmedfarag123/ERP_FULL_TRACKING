import { supabase } from '../lib/supabase';

export type DispatcherNotificationType = 'order' | 'customer' | 'alert' | 'sync' | 'system';

export interface DispatcherNotification {
  id: string;
  type: DispatcherNotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  metadata: Record<string, unknown>;
}

function toNotificationType(value: unknown): DispatcherNotificationType {
  if (value === 'order' || value === 'customer' || value === 'alert' || value === 'sync' || value === 'system') {
    return value;
  }
  if (value === 'delivery') return 'order';
  return 'system';
}

async function getCurrentProfileId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error('جلسة المستخدم مطلوبة.');
  return user.id;
}

export async function fetchDispatcherNotifications(limit = 50): Promise<DispatcherNotification[]> {
  const profileId = await getCurrentProfileId();
  const { data: recipients, error: recipientsError } = await supabase
    .from('notification_recipients')
    .select('notification_id, read_at')
    .eq('user_id', profileId)
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
      timestamp: String(notification.sent_at),
      read: Boolean(readById.get(String(notification.id))),
      metadata,
    };
  });
}

export async function markDispatcherNotificationRead(notificationId: string) {
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });

  if (error) throw new Error(error.message);
}
