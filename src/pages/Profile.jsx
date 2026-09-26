import { useRef, useState } from "react";
import { Camera, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { localClient } from "@/API/localClient";
import { useAuth } from "@/lib/AuthContext";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [name, setName] = useState(user?.name || "");
  const [preview, setPreview] = useState(user?.avatarUrl || null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const chooseFile = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size > MAX_AVATAR_SIZE) {
      toast({ title: "Imagem inválida", description: "Use JPG, PNG ou WEBP de até 5 MB.", variant: "destructive" });
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const save = async () => {
    setSaving(true);
    try {
      let avatarUrl = user?.avatarUrl || null;
      if (file) avatarUrl = (await localClient.api.uploads.upload(file)).fileUrl;
      const updated = await localClient.auth.updateProfile({ name, avatarUrl });
      updateUser(updated);
      setPreview(updated?.avatarUrl || preview);
      setFile(null);
      toast({ title: "Perfil atualizado com sucesso." });
    } catch (error) {
      toast({ title: "Não foi possível atualizar seu perfil.", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <PageHeader title="Meu perfil" description="Gerencie suas informações pessoais e sua foto de perfil." />
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <section className="glass-card flex flex-col items-center gap-4 p-6 text-center">
        <Avatar name={name} src={preview} size="lg" />
        <div><p className="font-semibold">{name || "Usuário"}</p><p className="text-sm text-muted-foreground">{user?.email}</p></div>
        <SubscriptionBadge plan={user?.plan} />
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={chooseFile} />
        <Button variant="outline" className="w-full gap-2" onClick={() => fileRef.current?.click()}><Camera className="h-4 w-4" />Alterar foto</Button>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP · até 5 MB</p>
      </section>
      <section className="glass-card space-y-5 p-6">
        <div><h2 className="text-lg font-semibold">Informações pessoais</h2><p className="text-sm text-muted-foreground">Seus dados básicos de acesso.</p></div>
        <div className="space-y-2"><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="profile-email">E-mail</Label><Input id="profile-email" value={user?.email || ""} readOnly disabled /></div>
        <Button onClick={save} disabled={saving || name.trim().length < 2} className="gap-2"><Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar alterações"}</Button>
      </section>
    </div>
  </div>;
}
