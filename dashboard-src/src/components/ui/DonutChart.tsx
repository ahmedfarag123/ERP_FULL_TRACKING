import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

const STATUS_COLORS: Record<string, string> = {
  Exceeded: "#10b981",
  "On Track": "#3b82f6",
  "At Risk": "#f59e0b",
  Missed: "#ef4444",
  Pending: "#9ca3af",
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#9ca3af";
}

export function DonutChart({
  data,
  size = 160,
  thickness = 24,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={(size - thickness * 2) / 2}
            outerRadius={(size - thickness) / 2}
            dataKey="value"
            stroke="none"
            paddingAngle={data.length > 1 ? 2 : 0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value}`, name]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <span className="text-xl font-bold text-gray-900">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-[10px] text-gray-500">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function DonutLegend({ data }: { data: DonutSegment[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="flex flex-wrap gap-3">
      {data.filter(d => d.value > 0).map((d) => (
        <div key={d.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
          <span className="text-xs text-gray-600">{d.label}</span>
          <span className="text-xs font-semibold text-gray-900">{d.value}</span>
          {total > 0 && (
            <span className="text-[10px] text-gray-400">
              ({Math.round((d.value / total) * 100)}%)
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export { STATUS_COLORS };
