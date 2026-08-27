import { useEffect, useState, useCallback, useMemo } from "react";
import { localClient } from "@/API/localClient";
import { useToast } from "@/components/ui/use-toast";

export function useCrud(entityName, { empty }) {
  const entity = useMemo(() => localClient.entities[entityName], [entityName]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    entity
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, [entity]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setForm({ ...empty });
    setEditingId(null);
    setOpen(true);
  };
  const openEdit = (it) => {
    setForm({ ...it });
    setEditingId(it.id);
    setOpen(true);
  };
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await entity.update(editingId, form);
        toast({ title: "Registro atualizado" });
      } else {
        await entity.create(form);
        toast({ title: "Registro criado" });
      }
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (it) => {
    await entity.delete(it.id);
    toast({ title: "Registro removido" });
    load();
  };

  return {
    items,
    loading,
    open,
    setOpen,
    form,
    editingId,
    saving,
    openNew,
    openEdit,
    update,
    save,
    remove,
    load,
  };
}
