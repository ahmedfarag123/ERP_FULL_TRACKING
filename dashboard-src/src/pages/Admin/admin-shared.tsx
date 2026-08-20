import type { ReactNode } from "react";

export function SectionCard(props: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${props.className ?? ""}`}
    >
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {props.title}
            </h2>
            {props.description ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {props.description}
              </p>
            ) : null}
          </div>
          {props.actions ? <div className="flex flex-wrap gap-2">{props.actions}</div> : null}
        </div>
      </div>
      <div className="p-5">{props.children}</div>
    </section>
  );
}

export function MetricCard(props: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass =
    props.tone === "success"
      ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10"
      : props.tone === "warning"
        ? "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
        : props.tone === "danger"
          ? "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
          : props.tone === "info"
            ? "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"
            : "border-gray-200 bg-brand-25 dark:border-gray-800 dark:bg-gray-900/50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {props.label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
        {props.value}
      </p>
      {props.detail ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{props.detail}</p>
      ) : null}
    </div>
  );
}

export function EmptyState(props: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        {props.title}
      </h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        {props.description}
      </p>
      {props.action ? <div className="mt-4">{props.action}</div> : null}
    </div>
  );
}

export function Field(props: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {props.label}
      </span>
      {props.children}
      {props.hint ? (
        <span className="block text-xs text-gray-400 dark:text-gray-500">{props.hint}</span>
      ) : null}
    </label>
  );
}
