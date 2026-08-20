import type {
  DashboardMapMarker,
  DashboardRegionStat,
} from "../../types/admin-dashboard";
import CountryMap from "./CountryMap";

interface DemographicCardProps {
  regions: DashboardRegionStat[];
  markers: DashboardMapMarker[];
  isLoading?: boolean;
}

export default function DemographicCard({
  regions,
  markers,
  isLoading = false,
}: DemographicCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Geographic Coverage
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customer concentration by governorate and district
          </p>
        </div>
        <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
          Top regions
        </span>
      </div>

      <div className="my-6 overflow-hidden rounded-2xl border border-gray-200 px-4 py-6 dark:border-gray-800 sm:px-6">
        <div
          id="mapOne"
          className="mapOne map-btn -mx-4 -my-6 h-[212px] w-[252px] 2xsm:w-[307px] xsm:w-[358px] sm:-mx-6 md:w-[668px] lg:w-[634px] xl:w-[393px] 2xl:w-[554px]"
        >
          <CountryMap markers={markers} />
        </div>
      </div>

      <div className="space-y-5">
        {isLoading && regions.length === 0
          ? Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]"
              />
            ))
          : regions.map((region) => (
              <div key={region.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    {region.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                      {region.name}
                    </p>
                    <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                      {region.count.toLocaleString("en-US")} customers
                    </span>
                  </div>
                </div>

                <div className="flex w-full max-w-[140px] items-center gap-3">
                  <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-white/[0.02]">
                    <div
                      className="absolute left-0 top-0 flex h-full items-center justify-center rounded-sm bg-brand-500 text-xs font-medium text-white"
                      style={{ width: `${region.percentage}%` }}
                    />
                  </div>
                  <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    {region.percentage}%
                  </p>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
