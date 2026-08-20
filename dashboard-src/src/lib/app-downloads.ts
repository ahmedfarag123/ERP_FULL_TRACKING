import { supabase } from "./supabase";
import { DRIVER_APP_URL, DISPATCHER_APP_URL } from "./external-apps";

export type AppDownloadKey = "sales_app" | "driver_app" | "dispatcher_app";

export type AppDownloadLink = {
  appKey: AppDownloadKey;
  label: string;
  description: string;
  href: string;
};

export const DEFAULT_APP_DOWNLOAD_LINKS: AppDownloadLink[] = [
  {
    appKey: "sales_app",
    label: "تطبيق المبيعات",
    description: "فتح صفحة تثبيت مساحة عمل المبيعات.",
    href: "/sales/",
  },
  {
    appKey: "driver_app",
    label: "تطبيق السائق",
    description: "فتح صفحة تثبيت مساحة عمل السائق.",
    href: DRIVER_APP_URL,
  },
  {
    appKey: "dispatcher_app",
    label: "تطبيق الموزع",
    description: "فتح صفحة تثبيت مساحة عمل الموزع.",
    href: DISPATCHER_APP_URL,
  },
];

type AppDownloadLinkRow = {
  app_key: AppDownloadKey;
  label: string | null;
  description: string | null;
  download_url: string | null;
};

export async function listAppDownloadLinks(): Promise<AppDownloadLink[]> {
  try {
    const { data, error } = await supabase
      .from("app_download_links")
      .select("app_key, label, description, download_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return DEFAULT_APP_DOWNLOAD_LINKS;
    }

    const merged = new Map<AppDownloadKey, AppDownloadLink>(
      DEFAULT_APP_DOWNLOAD_LINKS.map((link) => [link.appKey, link]),
    );

    (data as AppDownloadLinkRow[]).forEach((row) => {
      if (!row.download_url) return;
      merged.set(row.app_key, {
        appKey: row.app_key,
        label: row.label?.trim() || merged.get(row.app_key)?.label || "تحميل التطبيق",
        description:
          row.description?.trim() ||
          merged.get(row.app_key)?.description ||
          "فتح صفحة تثبيت مساحة العمل.",
        href: row.download_url,
      });
    });

    return DEFAULT_APP_DOWNLOAD_LINKS.map((fallback) => {
      const link = merged.get(fallback.appKey) ?? fallback;
      if (link.appKey === "driver_app") return { ...link, href: DRIVER_APP_URL };
      if (link.appKey === "dispatcher_app") return { ...link, href: DISPATCHER_APP_URL };
      return link;
    });
  } catch {
    return DEFAULT_APP_DOWNLOAD_LINKS;
  }
}
