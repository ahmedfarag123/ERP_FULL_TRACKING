import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const DONUT_COLORS = {
  pending: "#f59e0b",
  partial: "#3b82f6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

export default function DeliveryStatusChart({
  data,
}: {
  data: Array<{
    key: "pending" | "partial" | "delivered" | "cancelled";
    label: string;
    count: number;
  }>;
}) {
  return (
    <div className="mx-auto h-[256px] w-full max-w-[260px] min-w-0 min-h-[256px]">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 260, height: 256 }}
      >
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={58}
            outerRadius={84}
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={DONUT_COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => Number(value ?? 0).toLocaleString("en-US")}
            contentStyle={{
              borderRadius: 12,
              background: "#111827",
              border: "none",
              color: "#fff",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
