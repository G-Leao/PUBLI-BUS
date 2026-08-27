import { useCrud } from "@/hooks/useCrud";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";

const statusMap = {
  active: {
    label: "Ativo",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  inactive: { label: "Inativo", className: "bg-muted text-muted-foreground" },
};
const empty = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  status: "active",
  notes: "",
};

export default function Advertisers() {
  const c = useCrud("Advertiser", { empty });
  if (c.loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Empresas Anunciantes"
        description="Gerencie os anunciantes que veiculam campanhas nos tablets."
        action={
          <Button onClick={c.openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Anunciante
          </Button>
        }
      />

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell>
                  {it.contact_name || "—"}
                  {it.email && (
                    <>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {it.email}
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell>{it.phone || "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={it.status} map={statusMap} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => c.openEdit(it)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => c.remove(it)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {c.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhum anunciante cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={c.open} onOpenChange={c.setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {c.editingId ? "Editar Anunciante" : "Novo Anunciante"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da empresa anunciante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da empresa *</Label>
              <Input
                value={c.form.name || ""}
                onChange={(e) => c.update({ name: e.target.value })}
              />
            </div>
            <div>
              <Label>Contato</Label>
              <Input
                value={c.form.contact_name || ""}
                onChange={(e) => c.update({ contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={c.form.email || ""}
                onChange={(e) => c.update({ email: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={c.form.phone || ""}
                onChange={(e) => c.update({ phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={c.form.status}
                onValueChange={(v) => c.update({ status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={c.form.notes || ""}
                onChange={(e) => c.update({ notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={c.save} disabled={c.saving}>
              {c.saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
