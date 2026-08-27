import { useEffect, useState } from "react";
import { localClient } from "@/API/localClient";
import { PageHeader } from "@/components/PageHeader";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Save, Wrench, ShieldCheck } from "lucide-react";

const features = [
  { key: "includes_license", label: "Licença de uso" },
  { key: "includes_hosting", label: "Hospedagem" },
  { key: "includes_updates", label: "Atualizações" },
  { key: "includes_monitoring", label: "Monitoramento" },
  { key: "includes_support", label: "Suporte técnico" },
  { key: "includes_maintenance", label: "Manutenção" },
];

const defaults = {
  plan_name: "Plano Padrão",
  max_replacements_per_month: 2,
  extra_fee_per_device: 250,
  monthly_fee: 0,
  includes_license: true,
  includes_hosting: true,
  includes_updates: true,
  includes_monitoring: true,
  includes_support: true,
  includes_maintenance: true,
};

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [id, setId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    localClient.entities.MaintenanceConfig.list()
      .then((items) => {
        if (items.length) {
          setConfig(items[0]);
          setId(items[0].id);
        } else setConfig({ ...defaults });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !config) return <Loading />;
  const upd = (patch) => setConfig((c) => ({ ...c, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      if (id) await localClient.entities.MaintenanceConfig.update(id, config);
      else {
        const created = await localClient.entities.MaintenanceConfig.create(config);
        setId(created.id);
      }
      toast({ title: "Configurações salvas" });
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Defina o plano de manutenção e o limite de substituições de tablets."
        action={
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-indigo-500" />
            <h3 className="font-semibold">Manutenção</h3>
          </div>
          <div>
            <Label>Nome do plano</Label>
            <Input
              value={config.plan_name}
              onChange={(e) => upd({ plan_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Substituições inclusas por mês</Label>
            <Input
              type="number"
              value={config.max_replacements_per_month}
              onChange={(e) =>
                upd({ max_replacements_per_month: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Taxa extra por equipamento (R$)</Label>
            <Input
              type="number"
              value={config.extra_fee_per_device}
              onChange={(e) =>
                upd({ extra_fee_per_device: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Mensalidade (R$)</Label>
            <Input
              type="number"
              value={config.monthly_fee}
              onChange={(e) => upd({ monthly_fee: Number(e.target.value) })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Acima de {config.max_replacements_per_month} substituições/mês, é
            cobrada a taxa extra de R$ {config.extra_fee_per_device} por
            equipamento.
          </p>
        </div>
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h3 className="font-semibold">Itens inclusos</h3>
          </div>
          {features.map((f) => (
            <div key={f.key} className="flex items-center justify-between">
              <Label>{f.label}</Label>
              <Switch
                checked={!!config[f.key]}
                onCheckedChange={(v) => upd({ [f.key]: v })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
