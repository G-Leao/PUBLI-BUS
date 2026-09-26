import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPlanPrice } from "@/config/plans";

export function PlanCard({ plan, currentPlan, onUpgrade }) {
  const current = plan.id === currentPlan;
  const lower = !current && ["FREE", "PLUS", "PRO"].indexOf(plan.id) < ["FREE", "PLUS", "PRO"].indexOf(currentPlan);
  return (
    <Card className={`relative flex flex-col ${plan.popular ? "border-indigo-500 shadow-lg shadow-indigo-500/10" : ""}`}>
      {plan.popular && <div className="absolute right-4 top-0 -translate-y-1/2 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white"><Star className="mr-1 inline h-3 w-3" /> MAIS POPULAR</div>}
      <CardHeader><CardTitle>{plan.name}</CardTitle><p className="text-sm text-muted-foreground">{plan.description}</p><div className="pt-3 text-3xl font-bold">{formatPlanPrice(plan.price)}<span className="text-sm font-normal text-muted-foreground">/mês</span></div></CardHeader>
      <CardContent className="flex flex-1 flex-col"><ul className="flex-1 space-y-3 text-sm">{plan.benefits.map((benefit) => <li key={benefit} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-500" />{benefit}</li>)}</ul><Button className="mt-6 w-full" variant={current ? "secondary" : "default"} disabled={current} onClick={() => onUpgrade(plan)}>{current ? "Plano atual" : lower ? "Downgrade" : "Fazer upgrade"}</Button></CardContent>
    </Card>
  );
}
