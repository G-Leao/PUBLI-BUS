import { useEffect, useState } from "react";
import { localClient } from "@/API/localClient";
import { PageHeader } from "@/components/PageHeader";
import { Loading } from "@/components/Loading";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PlayCircle, BookOpen } from "lucide-react";

const categoryOrder = [
  "Primeiros Passos",
  "Campanhas",
  "Tablets",
  "Configurações",
  "Relatórios",
];

export default function HelpCenter() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    localClient.entities.HelpVideo.list()
      .then(setVideos)
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Loading />;

  let byCategory = categoryOrder
    .map((cat) => ({ cat, items: videos.filter((v) => v.category === cat) }))
    .filter((g) => g.items.length > 0);
  const categorized = new Set(byCategory.map((g) => g.cat));
  const others = videos.filter((v) => !categorized.has(v.category));
  if (others.length) byCategory.push({ cat: "Outros", items: others });

  return (
    <div>
      <PageHeader
        title="Central de Ajuda"
        description="Tutoriais em vídeo para você dominar a plataforma."
      />

      {byCategory.map((group) => (
        <div key={group.cat} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold">{group.cat}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((v) => (
              <button
                key={v.id}
                onClick={() => setActive(v)}
                className="glass-card overflow-hidden text-left group hover:ring-2 hover:ring-indigo-500/40 transition-all"
              >
                <div className="aspect-video bg-gradient-to-br from-indigo-500/30 to-violet-600/30 flex items-center justify-center">
                  <PlayCircle className="h-10 w-10 text-white/90 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-4">
                  <h3 className="font-medium mb-1">{v.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {v.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {videos.length === 0 && (
        <div className="glass-card text-center py-16 text-muted-foreground">
          Nenhum tutorial disponível
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          {active && (
            <div>
              {active.video_url && active.video_url.includes("youtube") ? (
                <iframe
                  className="w-full aspect-video"
                  src={active.video_url.replace("watch?v=", "embed/")}
                  title={active.title}
                  allowFullScreen
                />
              ) : active.video_url ? (
                <video
                  src={active.video_url}
                  controls
                  className="w-full aspect-video"
                />
              ) : (
                <div className="w-full aspect-video bg-muted flex items-center justify-center">
                  <PlayCircle className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="p-5">
                <h3 className="font-semibold mb-1">{active.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {active.description}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
