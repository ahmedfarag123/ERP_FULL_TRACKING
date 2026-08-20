import type { DriverNotification } from '@/types/driverBackend';
import { supabase, withSupabaseLockRetry } from '@/lib/supabase';

async function getCurrentDriverProfileId() {
  const {
    data: { user },
    error,
  } = await withSupabaseLockRetry(() => supabase.auth.getUser());

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error('جلسة السائق مطلوبة.');
  }

  return user.id;
}

export async function fetchDriverNotifications(limit = 50): Promise<DriverNotification[]> {
  const profileId = await getCurrentDriverProfileId();
  const { data: recipients, error: recipientsError } = await supabase
    .from('notification_recipients')
    .select('notification_id, read_at, delivered_at')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (recipientsError) {
    throw new Error(recipientsError.message);
  }

  const recipientRows = recipients ?? [];
  const notificationIds = recipientRows
    .map((row) => row.notification_id)
    .filter((value): value is string => Boolean(value));

  if (notificationIds.length === 0) {
    return [];
  }

  const { data: notifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('id, title, body, sent_at, metadata')
    .in('id', notificationIds)
    .order('sent_at', { ascending: false });

  if (notificationsError) {
    throw new Error(notificationsError.message);
  }

  const recipientByNotification = new Map(
    recipientRows.map((row) => [
      String(row.notification_id),
      {
        readAt: row.read_at ?? null,
        deliveredAt: row.delivered_at ?? null,
      },
    ])
  );

  return (notifications ?? []).map((notification) => {
    const recipient = recipientByNotification.get(String(notification.id));
    return {
      id: String(notification.id),
      title: String(notification.title),
      body: String(notification.body),
      sentAt: String(notification.sent_at),
      readAt: recipient?.readAt ?? null,
      deliveredAt: recipient?.deliveredAt ?? null,
      metadata: (notification.metadata ?? {}) as Record<string, unknown>,
    };
  });
}

export async function markDriverNotificationRead(notificationId: string) {
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
