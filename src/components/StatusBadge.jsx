import { cn } from "@/lib/utils";

export function StatusBadge({ status, map }) {
  const cfg = map[status] || {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        cfg.className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {cfg.label}
    </span>
  );
}
