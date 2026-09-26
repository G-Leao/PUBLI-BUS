import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { PlanCard } from "@/components/PlanCard";
import { PLANS, getPlan } from "@/config/plans";
import { useAuth } from "@/lib/AuthContext";
import { UpgradeModal } from "@/components/UpgradeModal";

const rows = [
  ["Anunciantes", "3", "20", "Ilimitado"], ["Campanhas", "5", "30", "Ilimitado"], ["Tablets", "2", "10", "50"],
  ["Relatórios", "Básico", "Completo", "Completo"], ["Analytics", "Básico", "Básico", "Avançado"], ["Suporte", "—", "—", "Prioritário"],
  ["Gestão de campanhas", "✓", "✓", "✓"], ["Dashboard", "✓", "✓", "✓"],
];

export default function Plans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentPlan = getPlan(user?.plan).id;
  const requestUpgrade = (plan) => navigate(`/planos?upgrade=${plan.id}`);
  return <div className="space-y-8">
    <PageHeader title="Escolha o plano ideal para sua operação" description="Comece gratuitamente e evolua conforme sua operação cresce." />
    <div className="grid gap-6 md:grid-cols-3">{Object.values(PLANS).map((plan) => <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan} onUpgrade={requestUpgrade} />)}</div>
    <section className="glass-card overflow-x-auto p-4 sm:p-6"><h2 className="mb-4 text-xl font-semibold">Compare os planos</h2><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b"><th className="p-3">Recurso</th><th className="p-3">Free</th><th className="p-3">Plus</th><th className="p-3">Pro</th></tr></thead><tbody>{rows.map(([name, ...values]) => <tr key={name} className="border-b last:border-0"><td className="p-3 font-medium">{name}</td>{values.map((value) => <td key={value} className="p-3 text-muted-foreground">{value}</td>)}</tr>)}</tbody></table></section>
    <UpgradeModal planId={searchParams.get("upgrade")} />
  </div>;
}
