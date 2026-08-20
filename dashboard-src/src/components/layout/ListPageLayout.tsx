import type { ReactNode } from "react";

export default function ListPageLayout({
  header,
  notices,
  stats,
  filters,
  children,
}: {
  header: ReactNode;
  notices?: ReactNode;
  stats?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {header}
      {notices}
      {stats}
      {filters}
      {children}
    </div>
  );
}
