export function ProgressBar({ current, total, className = "" }: { current: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs text-neutral-500 mb-1">
        <span>{current}/{total} séries</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
