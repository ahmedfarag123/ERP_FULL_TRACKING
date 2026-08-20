import type { ReactNode } from "react";
import { MapPinIcon } from "@heroicons/react/24/outline";
import VisitFeedCard from "./VisitFeedCard";
import type { VisitFeedItem } from "./VisitFeedCard";
import EmptyState from "../../ui/EmptyState";

interface VisitFeedProps {
  visits: VisitFeedItem[];
  isLoading: boolean;
  footer?: ReactNode;
}

export default function VisitFeed({ visits, isLoading, footer }: VisitFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white py-16 dark:border-gray-800 dark:bg-white/[0.02]">
        <EmptyState
          icon={<MapPinIcon className="h-10 w-10 text-gray-300" />}
          title="لا توجد زيارات"
          description="جرب تعديل المرشحات أو التاريخ."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {visits.map((visit) => (
          <VisitFeedCard key={visit.id} visit={visit} />
        ))}
      </div>
      {footer}
    </div>
  );
}
