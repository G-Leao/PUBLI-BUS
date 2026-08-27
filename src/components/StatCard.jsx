import { cn } from '@/lib/utils';

export function StatCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={cn('p-3 rounded-xl', accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}