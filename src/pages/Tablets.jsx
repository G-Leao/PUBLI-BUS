import { useState } from "react";
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
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const statusMap = {
  online: {
    label: "Online",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  offline: {
    label: "Offline",
    className: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  maintenance: {
    label: "Manutenção",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
};
const empty = {
  device_id: "",
  patrimonio: "",
  bus: "",
  line: "",
  status: "online",
  last_sync: "",
  system_version: "1.0.0",
  company_name: "",
};

export default function Tablets() {
  const c = useCrud("Tablet", { empty });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  if (c.loading) return <Loading />;

  const filtered = c.items.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      (!search ||
        (t.bus || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.line || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.patrimonio || "").includes(search) ||
        (t.device_id || "").includes(search)),
  );

  return (
    <div>
      <PageHeader
        title="Tablets"
        description="Monitore e gerencie os tablets instalados nos ônibus."
        action={
          <Button onClick={c.openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Tablet
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ônibus, linha, patrimônio..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="maintenance">Manutenção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device ID</TableHead>
              <TableHead>Patrimônio</TableHead>
              <TableHead>Ônibus</TableHead>
              <TableHead>Linha</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última Sync</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">
                  {t.device_id}
                </TableCell>
                <TableCell>{t.patrimonio}</TableCell>
                <TableCell className="font-medium">{t.bus || "—"}</TableCell>
                <TableCell>{t.line || "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} map={statusMap} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {t.last_sync
                    ? new Date(t.last_sync).toLocaleString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {t.system_version || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => c.openEdit(t)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => c.remove(t)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhum tablet encontrado
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
              {c.editingId ? "Editar Tablet" : "Novo Tablet"}
            </DialogTitle>
            <DialogDescription>
              Cadastre o tablet instalado em um ônibus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Device ID *</Label>
              <Input
                value={c.form.device_id || ""}
                onChange={(e) => c.update({ device_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Patrimônio *</Label>
              <Input
                value={c.form.patrimonio || ""}
                onChange={(e) => c.update({ patrimonio: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ônibus</Label>
                <Input
                  value={c.form.bus || ""}
                  onChange={(e) => c.update({ bus: e.target.value })}
                />
              </div>
              <div>
                <Label>Linha</Label>
                <Input
                  value={c.form.line || ""}
                  onChange={(e) => c.update({ line: e.target.value })}
                />
              </div>
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
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Versão do sistema</Label>
              <Input
                value={c.form.system_version || ""}
                onChange={(e) => c.update({ system_version: e.target.value })}
              />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input
                value={c.form.company_name || ""}
                onChange={(e) => c.update({ company_name: e.target.value })}
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
