import type { ReactNode } from "react";
import { Link } from "react-router";

type BaseHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

type ListHeaderProps = BaseHeaderProps & {
  variant: "list";
  eyebrow?: string;
  meta?: ReactNode;
};

type DetailHeaderProps = BaseHeaderProps & {
  variant: "detail";
  backHref: string;
  backLabel?: string;
  badges?: ReactNode;
};

export type PageHeaderProps = ListHeaderProps | DetailHeaderProps;

export default function PageHeader(props: PageHeaderProps) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white px-6 py-6 dark:border-gray-800 dark:bg-white/[0.03] ${props.className ?? ""}`}
    >
      {props.variant === "detail" ? (
        <Link
          to={props.backHref}
          className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <span aria-hidden="true">←</span>
          {props.backLabel ?? "Back"}
        </Link>
      ) : props.eyebrow ? (
        <p className="text-xs font-normal uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {props.eyebrow}
        </p>
      ) : null}

      <div
        className={`flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between ${
          props.variant === "detail" ? "" : "mt-4"
        }`}
      >
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {props.title}
          </h1>
          {props.subtitle ? (
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {props.subtitle}
            </p>
          ) : null}
          {props.variant === "detail" && props.badges ? (
            <div className="mt-4 flex flex-wrap gap-2">{props.badges}</div>
          ) : null}
          {props.variant === "list" && props.meta ? (
            <div className="mt-4 flex flex-wrap gap-2">{props.meta}</div>
          ) : null}
        </div>

        {props.actions ? (
          <div className="flex flex-wrap items-start gap-3">{props.actions}</div>
        ) : null}
      </div>
    </section>
  );
}
