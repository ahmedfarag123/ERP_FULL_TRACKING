import type { ReactNode } from "react";

export default function DashboardLayout({
  header,
  notices,
  stats,
  children,
}: {
  header: ReactNode;
  notices?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {header}
      {notices}
      {stats}
      {children}
    </div>
  );
}
