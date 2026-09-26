import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPlan } from "@/config/plans";

export function UpgradeModal({ planId }) {
  const [, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(Boolean(planId));
  const plan = getPlan(planId);
  const close = () => { setOpen(false); setSearchParams({}); };
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setSearchParams({}); }}>
    <DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-indigo-500" />Evolua para o {plan.name}</DialogTitle><DialogDescription>O pagamento online será integrado em breve. Nenhuma cobrança foi realizada.</DialogDescription></DialogHeader><div className="rounded-xl bg-muted/50 p-4 text-sm">Sua solicitação de upgrade está preparada para integração com Mercado Pago, Stripe ou outro gateway.</div><DialogFooter><Button variant="outline" onClick={close}>Agora não</Button><Button onClick={close}>Entendi</Button></DialogFooter></DialogContent>
  </Dialog>;
}
