const PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
];

function hashName(value: string) {
  return Array.from(value).reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function initials(value: string) {
  const parts = value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "NA";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export interface CustomerAvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  /** Use circular mask (e.g. directory tables) instead of rounded rectangles */
  shape?: "rounded" | "circle";
}

export default function CustomerAvatar({
  name,
  src,
  size = "md",
  shape = "rounded",
}: CustomerAvatarProps) {
  const corner =
    shape === "circle" ? "rounded-full" : size === "sm" || size === "xs" ? "rounded-xl" : "rounded-2xl";

  const dimensions =
    size === "xs"
      ? `h-7 w-7 text-[10px] ${corner}`
      : size === "sm"
        ? `h-9 w-9 text-xs ${corner}`
        : size === "lg"
          ? `h-14 w-14 text-base ${corner}`
          : `h-11 w-11 text-sm ${corner}`;
  const tone = PALETTE[hashName(name) % PALETTE.length];

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${dimensions} shrink-0 object-cover`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-semibold ${dimensions} ${tone}`}
    >
      {initials(name)}
    </div>
  );
}
