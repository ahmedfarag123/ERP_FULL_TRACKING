import type { ReactNode } from "react";

export default function DetailPageLayout({
  header,
  notices,
  timeline,
  main,
  side,
}: {
  header: ReactNode;
  notices?: ReactNode;
  timeline?: ReactNode;
  main: ReactNode;
  side?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {header}
      {notices}
      {timeline}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">{main}</div>
        {side ? (
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-1 xl:sticky xl:top-24 xl:self-start">{side}</div>
        ) : null}
      </div>
    </div>
  );
}
