import { clsx } from "clsx";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  tone?: "green" | "blue" | "yellow" | "red" | "gray";
}

const toneMap: Record<string, string> = {
  green: "#10b981",
  blue: "#3b82f6",
  yellow: "#f59e0b",
  red: "#ef4444",
  gray: "#9ca3af",
};

function getScoreColor(score: number): string {
  if (score >= 90) return toneMap.green;
  if (score >= 75) return toneMap.blue;
  if (score >= 50) return toneMap.yellow;
  return toneMap.red;
}

export function ScoreRing({ score, size = 64, strokeWidth = 5, label, tone }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const color = tone ? toneMap[tone] : getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">{Math.round(score)}</span>
        </div>
      </div>
      {label && <span className="text-[10px] text-gray-500">{label}</span>}
    </div>
  );
}
