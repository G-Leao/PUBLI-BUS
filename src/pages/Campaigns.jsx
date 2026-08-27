import { useEffect, useState } from 'react';
import { localClient } from "@/API/localClient";
import { useCrud } from '@/hooks/useCrud';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, Upload, Pencil, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';

const statusMap = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Agendada', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  active: { label: 'Ativa', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  finished: { label: 'Finalizada', className: 'bg-zinc-500/15 text-zinc-500' },
  paused: { label: 'Pausada', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
};
const empty = { name: '', advertiser_name: '', media_type: 'image', media_url: '', start_date: '', end_date: '', status: 'draft', display_order: 0, duration_seconds: 10 };

export default function Campaigns() {
  const c = useCrud('Campaign', { empty });
  const [advertisers, setAdvertisers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { localClient.entities.Advertiser.list().then(setAdvertisers); }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const mediaUrl = await localClient.files.createUrl(file);
      c.update({ media_url: mediaUrl, media_type: file.type.startsWith('video') ? 'video' : 'image' });
      toast({ title: 'Mídia enviada' });
    } catch (err) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (c.loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Campanhas Publicitárias"
        description="Cadastre, agende e ordene as propagandas exibidas em loop nos tablets."
        action={<Button onClick={c.openNew} className="gap-2"><Plus className="h-4 w-4" />Nova Campanha</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {c.items.map(it => (
          <div key={it.id} className="glass-card overflow-hidden group relative">
            <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
              {it.media_url ? (
                it.media_type === 'video'
                  ? <video src={it.media_url} className="w-full h-full object-cover" muted />
                  : <Image src={it.media_url} className="w-full h-full" fittingType="fill" />
              ) : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="absolute top-2 right-2">
              <StatusBadge status={it.status} map={statusMap} />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
              <Button variant="outline" size="sm" className="gap-1 bg-white/90" onClick={() => c.openEdit(it)}><Pencil className="h-3 w-3" />Editar</Button>
              <Button variant="ghost" size="icon" className="bg-white/90" onClick={() => c.remove(it)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
            <div className="p-3">
              <h3 className="font-medium truncate">{it.name}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {it.advertiser_name || 'Sem anunciante'}
                {it.start_date && ` · ${new Date(it.start_date).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
          </div>
        ))}
        {c.items.length === 0 && <div className="col-span-full text-center text-muted-foreground py-16 glass-card">Nenhuma campanha cadastrada</div>}
      </div>

      <Dialog open={c.open} onOpenChange={c.setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{c.editingId ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
            <DialogDescription>Configure a mídia e o agendamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={c.form.name || ''} onChange={e => c.update({ name: e.target.value })} /></div>
            <div>
              <Label>Anunciante</Label>
              <Select value={c.form.advertiser_name} onValueChange={v => c.update({ advertiser_name: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {advertisers.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mídia</Label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-sm">{uploading ? 'Enviando...' : c.form.media_url ? 'Trocar mídia' : 'Enviar imagem ou vídeo'}</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={onFile} />
              </label>
              {c.form.media_url && <p className="text-xs text-muted-foreground mt-1 truncate">{c.form.media_url}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="date" value={c.form.start_date?.slice(0, 10) || ''} onChange={e => c.update({ start_date: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={c.form.end_date?.slice(0, 10) || ''} onChange={e => c.update({ end_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ordem</Label><Input type="number" value={c.form.display_order || 0} onChange={e => c.update({ display_order: Number(e.target.value) })} /></div>
              <div><Label>Duração (s)</Label><Input type="number" value={c.form.duration_seconds || 10} onChange={e => c.update({ duration_seconds: Number(e.target.value) })} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={c.form.status} onValueChange={v => c.update({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={c.save} disabled={c.saving}>{c.saving ? 'Salvando...' : 'Salvar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
