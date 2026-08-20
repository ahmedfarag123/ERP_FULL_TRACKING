import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";

interface MonthlySalesChartProps {
  categories: string[];
  series: number[];
  isLoading?: boolean;
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) {
    return `EGP ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `EGP ${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  }

  return `EGP ${Math.round(value)}`;
}

export default function MonthlySalesChart({
  categories,
  series,
  isLoading = false,
}: MonthlySalesChartProps) {
  const options: ApexOptions = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 280,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "42%",
        borderRadius: 6,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: false,
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#667085",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => formatCompactCurrency(value),
        style: {
          colors: ["#667085"],
          fontSize: "12px",
        },
      },
    },
    legend: {
      show: false,
    },
    grid: {
      borderColor: "#F2F4F7",
      strokeDashArray: 4,
      yaxis: {
        lines: { show: true },
      },
      xaxis: {
        lines: { show: false },
      },
    },
    tooltip: {
      x: { show: false },
      y: {
        formatter: (value: number) => `${value.toLocaleString("en-US")} EGP`,
      },
    },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Monthly GMV
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Full synced order value over the last 12 months
          </p>
        </div>
        <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
          Last 12 months
        </span>
      </div>

      <div className="mt-6 max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[720px] xl:min-w-full">
          {isLoading ? (
            <div className="h-[280px] animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
          ) : (
            <Chart
              options={options}
              series={[
                {
                  name: "GMV",
                  data: series,
                },
              ]}
              type="bar"
              height={280}
            />
          )}
        </div>
      </div>
    </div>
  );
}
