import type { ReactNode } from "react";
import { CheckIcon } from "@heroicons/react/24/outline";

export interface StatusTimelineStep {
  label: string;
  state: "complete" | "active" | "upcoming";
  description?: ReactNode;
}

export default function StatusTimeline({
  steps,
  className = "",
}: {
  steps: StatusTimelineStep[];
  className?: string;
}) {
  return (
    <section
      className={`mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02] ${className}`}
    >
      <div className="flex min-w-0 items-start overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const prevComplete = index > 0 && steps[index - 1]?.state === "complete";
          const lineAfterComplete = step.state === "complete";

          return (
            <div key={step.label} className="flex min-w-[120px] flex-1 flex-col">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <div
                    className={`mb-5 h-0.5 flex-1 ${prevComplete ? "bg-emerald-300" : "bg-gray-200"} dark:opacity-80`}
                  />
                ) : (
                  <div className="mb-5 flex-1" />
                )}

                <div className="relative z-10 flex shrink-0 flex-col items-center">
                  {step.state === "complete" ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 text-white shadow-sm">
                      <CheckIcon className="h-4 w-4 text-white" strokeWidth={2.5} aria-hidden />
                    </span>
                  ) : step.state === "active" ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-600 bg-blue-600 text-sm font-bold text-white ring-4 ring-blue-100 dark:ring-blue-900/40">
                      {index + 1}
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-sm font-medium text-gray-300 dark:border-gray-600 dark:bg-transparent">
                      {index + 1}
                    </span>
                  )}
                </div>

                {index < steps.length - 1 ? (
                  <div
                    className={`mb-5 h-0.5 flex-1 ${lineAfterComplete ? "bg-emerald-300" : "bg-gray-200"} dark:opacity-80`}
                  />
                ) : (
                  <div className="mb-5 flex-1" />
                )}
              </div>

              <div className="mt-2 px-1 text-center">
                <p
                  className={`text-sm font-semibold ${
                    step.state === "complete"
                      ? "text-gray-900 dark:text-white"
                      : step.state === "active"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {step.label}
                </p>
                {step.description ? (
                  <p
                    className={`mt-1 text-xs ${
                      step.state === "active"
                        ? "text-blue-400 dark:text-blue-300/80"
                        : step.state === "complete"
                          ? "text-gray-500 dark:text-gray-400"
                          : "text-gray-300 dark:text-gray-600"
                    }`}
                  >
                    {step.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
