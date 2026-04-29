interface Props {
  value: number; // 0–100
  color?: string;
  gradient?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  color = "#5B8CFF",
  gradient = false,
  className = "",
}: Props) {
  return (
    <div className={`h-px bg-white/7 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: gradient
            ? "linear-gradient(to right, #5B8CFF, #34D399, #FB923C)"
            : color,
        }}
      />
    </div>
  );
}
