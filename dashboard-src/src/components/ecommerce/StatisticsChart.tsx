import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";

interface StatisticsChartProps {
  categories: string[];
  visitsSeries: number[];
  callsSeries: number[];
  isLoading?: boolean;
}

export default function StatisticsChart({
  categories,
  visitsSeries,
  callsSeries,
  isLoading = false,
}: StatisticsChartProps) {
  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit, sans-serif",
      labels: {
        colors: "#344054",
      },
    },
    colors: ["#465FFF", "#98A2B3"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 320,
      type: "line",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "straight",
      width: [3, 3],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.2,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      borderColor: "#F2F4F7",
      strokeDashArray: 4,
      xaxis: {
        lines: { show: false },
      },
      yaxis: {
        lines: { show: true },
      },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
    },
    xaxis: {
      type: "category",
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: {
        style: {
          colors: "#667085",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#667085"],
        },
      },
      title: {
        text: "",
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Activity Trend
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visits and CRM calls across the last 12 months
          </p>
        </div>
        <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
          Last 12 months
        </span>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[900px] xl:min-w-full">
          {isLoading ? (
            <div className="h-[320px] animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
          ) : (
            <Chart
              options={options}
              series={[
                {
                  name: "Visits",
                  data: visitsSeries,
                },
                {
                  name: "Calls",
                  data: callsSeries,
                },
              ]}
              type="area"
              height={320}
            />
          )}
        </div>
      </div>
    </div>
  );
}
