import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";

interface MonthlyTargetProps {
  progress: number;
  targetValue: number;
  targetBaselineValue: number;
  actualValue: number;
  actualOrders: number;
  revenueToday: number;
  isLoading?: boolean;
}

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

export default function MonthlyTarget({
  progress,
  targetValue,
  targetBaselineValue,
  actualValue,
  actualOrders,
  revenueToday,
  isLoading = false,
}: MonthlyTargetProps) {
  const gapValue = Math.max(targetValue - actualValue, 0);

  const options: ApexOptions = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 320,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: {
          size: "78%",
        },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 6,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: "34px",
            fontWeight: "700",
            offsetY: -36,
            color: "#101828",
            formatter: (value: number) => `${Math.round(value)}%`,
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: ["#465FFF"],
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Progress"],
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="rounded-2xl bg-white px-5 pb-8 pt-5 shadow-default dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Monthly GMV Target
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Temporary target uses last month GMV with a 20% uplift.
            </p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            Current month
          </span>
        </div>

        <div className="relative mt-2">
          <div className="max-h-[320px]">
            {isLoading ? (
              <div className="h-[320px] animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
            ) : (
              <Chart options={options} series={[progress]} type="radialBar" height={320} />
            )}
          </div>

          <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[94%] rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
            {progress >= 100 ? "Target hit" : gapValue > 0 ? "In progress" : "On track"}
          </span>
        </div>

        <div className="mx-auto mt-8 max-w-[340px] text-center">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {currencyFormatter.format(actualValue)} closed from {actualOrders.toLocaleString("en-US")} synced orders
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Remaining gap {currencyFormatter.format(gapValue)}. Today contributed{" "}
            {currencyFormatter.format(revenueToday)}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
        <div>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Last month
          </p>
          <p className="mt-1 text-center text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {currencyFormatter.format(targetBaselineValue)}
          </p>
        </div>

        <div className="border-x border-gray-100 px-2 dark:border-gray-800">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Target
          </p>
          <p className="mt-1 text-center text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {currencyFormatter.format(targetValue)}
          </p>
        </div>

        <div>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Actual
          </p>
          <p className="mt-1 text-center text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {currencyFormatter.format(actualValue)}
          </p>
        </div>
      </div>
    </div>
  );
}
