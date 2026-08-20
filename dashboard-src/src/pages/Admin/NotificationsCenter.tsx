import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import TextArea from "../../components/form/input/TextArea";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import {
  fetchLegacyNotifications,
  fetchLegacyUsers,
  sendLegacyNotification,
} from "../../lib/admin-operations-data";
import type {
  LegacyAdminUser,
  LegacyNotification,
} from "../../types/admin-operations";

export default function NotificationsCenter() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<LegacyNotification[]>([]);
  const [users, setUsers] = useState<LegacyAdminUser[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [importance, setImportance] = useState<"High" | "Medium" | "Normal">("Normal");
  const [audience, setAudience] = useState<"all" | "management" | "field">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [nextNotifications, nextUsers] = await Promise.all([
        fetchLegacyNotifications(),
        fetchLegacyUsers(),
      ]);
      setNotifications(nextNotifications);
      setUsers(nextUsers);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل مركز الإشعارات.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const recipients = useMemo(() => {
    if (audience === "management") {
      return users.filter((user) => user.isManagement).map((user) => user.email);
    }
    if (audience === "field") {
      return users.filter((user) => !user.isManagement).map((user) => user.email);
    }
    return users.map((user) => user.email);
  }, [audience, users]);

  const handleSend = async () => {
    if (!profile) return;
    if (!title.trim() || !content.trim()) {
      setError("أدخل عنوان ومحتوى الإشعار أولًا.");
      return;
    }
    if (recipients.length === 0) {
      setError("لا يوجد مستلمون لهذا النوع من الجمهور.");
      return;
    }

    setIsSending(true);
    setError("");
    setSuccess("");

    try {
      await sendLegacyNotification({
        title,
        content,
        sender: profile.email,
        importance,
        recipients,
      });
      setTitle("");
      setContent("");
      setImportance("Normal");
      setAudience("all");
      setSuccess("تم إرسال الإشعار بنجاح.");
      await loadData();
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "تعذر إرسال الإشعار.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <PageMeta title="Notifications | Sales Admin" description="Admin notifications center" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            مركز الإشعارات
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            إرسال ومراجعة الإشعارات المبنية على `Google Apps Script`.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-500/10 dark:text-green-300">
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              إرسال إشعار جديد
            </h2>
            <div className="space-y-4">
              <div>
                <Label>العنوان</Label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="عنوان الإشعار"
                />
              </div>
              <div>
                <Label>المحتوى</Label>
                <TextArea
                  value={content}
                  onChange={setContent}
                  rows={6}
                  placeholder="اكتب محتوى الإشعار"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>الأهمية</Label>
                  <select
                    value={importance}
                    onChange={(event) =>
                      setImportance(event.target.value as "High" | "Medium" | "Normal")
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
                  >
                    <option value="Normal">عادي</option>
                    <option value="Medium">متوسط</option>
                    <option value="High">مرتفع</option>
                  </select>
                </div>
                <div>
                  <Label>الجمهور</Label>
                  <select
                    value={audience}
                    onChange={(event) =>
                      setAudience(event.target.value as "all" | "management" | "field")
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
                  >
                    <option value="all">كل المستخدمين</option>
                    <option value="management">الإدارة فقط</option>
                    <option value="field">الميدان فقط</option>
                  </select>
                </div>
              </div>
              <div className="rounded-xl bg-brand-25 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900/50 dark:text-gray-300">
                سيتم الإرسال إلى {recipients.length} مستخدم.
              </div>
              <Button onClick={() => void handleSend()} disabled={isSending}>
                {isSending ? "جاري الإرسال..." : "إرسال الإشعار"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                آخر الإشعارات
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {notifications.length} إشعار
              </span>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                جاري تحميل الإشعارات...
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {notification.content}
                        </p>
                      </div>
                      <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-white/[0.02] dark:text-gray-200">
                        {notification.importance}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>من: {notification.sender}</span>
                      <span>{new Date(notification.timestamp).toLocaleString("en-GB")}</span>
                      <span>{notification.receivedUsers.length} مستلم</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
