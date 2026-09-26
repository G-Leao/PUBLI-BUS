import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function UsageLimit({ label, current = 0, limit, unit = "", onViewPlans }) {
  const unlimited = limit == null;
  const ratio = unlimited ? 0 : Math.min(100, (current / Math.max(limit, 1)) * 100);
  const nearLimit = !unlimited && ratio >= 80;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("text-muted-foreground", nearLimit && "text-amber-600 dark:text-amber-400")}>
          {current} / {unlimited ? "ilimitado" : limit}{unit && ` ${unit}`}
        </span>
      </div>
      {!unlimited && <Progress value={ratio} className={cn("h-2", ratio >= 100 && "[&>div]:bg-red-500", nearLimit && ratio < 100 && "[&>div]:bg-amber-500")} />}
      {nearLimit && ratio < 100 && <p className="text-xs text-amber-600 dark:text-amber-400">Você está próximo do limite. <button className="underline" onClick={onViewPlans}>Ver planos</button></p>}
      {ratio >= 100 && <p className="text-xs text-red-600 dark:text-red-400">Você atingiu o limite deste plano.</p>}
    </div>
  );
}
