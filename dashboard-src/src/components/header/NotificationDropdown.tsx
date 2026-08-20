import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AlertTriangleIcon, BellIcon, CheckCircleIcon, XIcon } from "lucide-react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { supabase } from "../../lib/supabase";
import { playNotificationSound } from "../../lib/notification-feedback";
import type { RealtimeChannel } from "@supabase/supabase-js";

type HeaderNotification = {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  metadata: Record<string, unknown>;
};

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

async function fetchHeaderNotifications(limit = 20): Promise<HeaderNotification[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw new Error(userError.message);
  if (!user) return [];

  const { data: recipients, error: recipientsError } = await supabase
    .from("notification_recipients")
    .select("notification_id, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (recipientsError) throw new Error(recipientsError.message);

  const recipientRows = recipients ?? [];
  const notificationIds = recipientRows
    .map((row) => row.notification_id)
    .filter((id): id is string => Boolean(id));

  if (notificationIds.length === 0) return [];

  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select("id, title, body, sent_at, metadata")
    .in("id", notificationIds)
    .order("sent_at", { ascending: false });

  if (notificationsError) throw new Error(notificationsError.message);

  const readById = new Map(recipientRows.map((row) => [String(row.notification_id), row.read_at ?? null]));

  return (notifications ?? []).map((notification) => ({
    id: String(notification.id),
    title: String(notification.title),
    body: String(notification.body),
    sentAt: String(notification.sent_at),
    readAt: readById.get(String(notification.id)) ?? null,
    metadata: (notification.metadata ?? {}) as Record<string, unknown>,
  }));
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  const loadNotifications = async () => {
    try {
      setError(null);
      setNotifications(await fetchHeaderNotifications());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  };

  useEffect(() => {
    void loadNotifications();

    let channel: RealtimeChannel | null = null;
    let active = true;

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) return;

      channel = supabase
        .channel(`admin-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notification_recipients",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              playNotificationSound();
            }
            void loadNotifications();
          },
        )
        .subscribe();
    };

    void subscribe();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const markRead = async (notificationId: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt: notification.readAt ?? new Date().toISOString() }
          : notification,
      ),
    );

    await supabase.rpc("mark_notification_read", { p_notification_id: notificationId });
  };

  return (
    <div className="relative">
      <button
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-brand-25/70 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 right-auto left-0  dark:hover:bg-white/[0.02] dark:hover:text-white"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <span className="absolute right-auto left-0  -top-1 z-10 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-900">
            {unreadCount > 99 ? "99+" : unreadCount}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-40" />
          </span>
        ) : null}
        <BellIcon className="h-5 w-5" />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px]"
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <div>
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notifications</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} unread</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-gray-500 transition hover:bg-brand-25/70 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
            aria-label="Close notifications"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <ul className="flex h-auto flex-col overflow-y-auto custom-scrollbar">
          {error ? (
            <li className="rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-200">
              {error}
            </li>
          ) : notifications.length === 0 ? (
            <li className="rounded-lg bg-brand-25 p-4 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
              No notifications yet.
            </li>
          ) : (
            notifications.map((notification) => {
              const isAlert = notification.metadata.type === "alert";
              return (
                <li key={notification.id}>
                  <DropdownItem
                    onItemClick={() => {
                      void markRead(notification.id);
                      setIsOpen(false);
                    }}
                    className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-brand-25/70 dark:border-gray-800 dark:hover:bg-white/5"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isAlert
                          ? "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-300"
                          : "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-300"
                      }`}
                    >
                      {isAlert ? <AlertTriangleIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
                    </span>

                    <span className="block min-w-0">
                      <span
                        className={`mb-1.5 block truncate text-theme-sm ${
                          notification.readAt
                            ? "text-gray-500 dark:text-gray-400"
                            : "font-semibold text-gray-800 dark:text-white/90"
                        }`}
                      >
                        {notification.title}
                      </span>
                      <span className="line-clamp-2 text-theme-xs text-gray-500 dark:text-gray-400">
                        {notification.body}
                      </span>
                      <span className="mt-1.5 flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                        <span>{isAlert ? "Alert" : "System"}</span>
                        <span className="h-1 w-1 rounded-full bg-gray-400" />
                        <span>{relativeTime(notification.sentAt)}</span>
                      </span>
                    </span>
                  </DropdownItem>
                </li>
              );
            })
          )}
        </ul>

        <Link
          to="/notifications"
          className="mt-3 block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-brand-25/70 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400 dark:hover:bg-gray-700"
          onClick={() => setIsOpen(false)}
        >
          View all notifications
        </Link>
      </Dropdown>
    </div>
  );
}
