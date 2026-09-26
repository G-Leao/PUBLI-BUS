import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPlan } from "@/config/plans";

export function SubscriptionBadge({ plan = "FREE" }) {
  const current = getPlan(plan);
  return <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 text-amber-500" /> Plano {current.name}</Badge>;
}
