import type { ReactNode } from "react";

export default function UtilityPageLayout({
  header,
  notices,
  children,
}: {
  header: ReactNode;
  notices?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {header}
      {notices}
      {children}
    </div>
  );
}
