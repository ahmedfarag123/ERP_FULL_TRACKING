import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function MonthlySalesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const value = Number(payload[0]?.value ?? 0);

  return (
    <div className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white shadow-lg">
      <p className="text-xs text-gray-300">{label}</p>
      <p className="font-semibold" dir="ltr">
        {currencyFormatter.format(value)}
      </p>
    </div>
  );
}

export default function MonthlySalesChart({
  data,
  guideLines,
}: {
  data: Array<{ label: string; revenue: number }>;
  guideLines: number[];
}) {
  return (
    <div className="h-[320px] w-full min-w-0 min-h-[320px]">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 560, height: 320 }}
      >
        <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 6" stroke="#e5e7eb" vertical={false} />
          {guideLines.map((y) => (
            <ReferenceLine
              key={y}
              y={y}
              stroke="#e5e7eb"
              strokeDasharray="4 6"
              strokeWidth={1}
            />
          ))}
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
          />
          <YAxis hide domain={[0, "auto"]} />
          <Tooltip
            content={<MonthlySalesTooltip />}
            cursor={{ fill: "rgb(59 130 246 / 0.08)" }}
          />
          <Bar dataKey="revenue" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
