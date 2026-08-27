import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { localClient } from "@/API/localClient";
import {
  Wifi,
  WifiOff,
  Maximize,
  Minimize,
  X,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  PlayCircle,
} from "lucide-react";

const CACHE_KEY = "publibus_player_cache";
const pill = "bg-black/40 backdrop-blur-md border border-white/10 text-white";

function getActiveAds(campaigns) {
  const today = new Date().toISOString().slice(0, 10);
  return campaigns
    .filter(
      (c) => (c.status === "active" || c.status === "scheduled") && c.media_url,
    )
    .filter(
      (c) =>
        (!c.start_date || c.start_date <= today) &&
        (!c.end_date || c.end_date >= today),
    )
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

export default function Player() {
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [clock, setClock] = useState(new Date());
  const [blobUrls, setBlobUrls] = useState({});
  const videoRef = useRef(null);
  const hideTimer = useRef(null);

  const resolveBlob = useCallback(async (url) => {
    try {
      const cache = await caches.open("publibus-media");
      const res = await cache.match(url);
      if (res) return URL.createObjectURL(await res.blob());
    } catch {
      /* ignore */
    }
    return null;
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setAds(data.ads || []);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    setSyncing(true);
    try {
      const campaigns = await localClient.entities.Campaign.list();
      const active = getActiveAds(campaigns);
      setAds(active);
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ads: active, syncedAt: new Date().toISOString() }),
      );
      try {
        const cache = await caches.open("publibus-media");
        await Promise.all(
          active.map((a) => cache.add(a.media_url).catch(() => {})),
        );
      } catch {
        /* ignore */
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    sync();
    const onOnline = () => {
      setOnline(true);
      sync();
    };
    const onOffline = () => {
      setOnline(false);
      sync();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [sync]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const wake = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);
  useEffect(() => {
    wake();
    return () => clearTimeout(hideTimer.current);
  }, [wake]);

  const total = ads.length;
  const current = total ? ads[index % total] : null;

  // Resolve playable src: online -> remote url; offline -> cached blob url (resolve async).
  const currentSrc = current
    ? online
      ? current.media_url
      : blobUrls[current.media_url] || current.media_url
    : "";

  // When offline, resolve blob URLs for all ads so media plays from cache.
  useEffect(() => {
    if (online || ads.length === 0) return;
    let alive = true;
    (async () => {
      const next = {};
      for (const ad of ads) {
        if (blobUrls[ad.media_url]) {
          next[ad.media_url] = blobUrls[ad.media_url];
          continue;
        }
        const b = await resolveBlob(ad.media_url);
        if (b) next[ad.media_url] = b;
      }
      if (alive && Object.keys(next).length) {
        setBlobUrls((prev) => {
          const changed = Object.entries(next).some(
            ([url, blobUrl]) => prev[url] !== blobUrl,
          );
          return changed ? { ...prev, ...next } : prev;
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [online, ads, blobUrls, resolveBlob]);

  // Restart video playback when the source changes.
  useEffect(() => {
    if (current?.media_type === "video" && videoRef.current && currentSrc) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentSrc, current]);

  // Auto-advance after the configured duration, looping forever.
  useEffect(() => {
    if (!current) return;
    const dur = (current.duration_seconds || 10) * 1000;
    const t = setTimeout(
      () => setIndex((i) => (i + 1) % Math.max(total, 1)),
      dur,
    );
    return () => clearTimeout(t);
  }, [index, current, total]);

  const goNext = useCallback(
    () => setIndex((i) => (i + 1) % Math.max(total, 1)),
    [total],
  );
  const toggleFullscreen = () => {
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  if (!current) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white gap-4">
        <PlayCircle className="h-12 w-12 text-white/40" />
        <p className="text-white/70">
          Nenhuma campanha ativa para exibir no tablet.
        </p>
        <Link
          to="/campanhas"
          className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-sm font-medium"
        >
          Cadastrar campanhas
        </Link>
      </div>
    );
  }

  const dur = current.duration_seconds || 10;

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      onMouseMove={wake}
      onMouseDown={wake}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {current.media_type === "video" && currentSrc ? (
            <video
              ref={videoRef}
              key={currentSrc}
              src={currentSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onError={goNext}
              className="w-full h-full object-cover"
            />
          ) : currentSrc ? (
            <motion.img
              src={currentSrc}
              alt=""
              initial={{ scale: 1 }}
              animate={{ scale: 1.06 }}
              transition={{ duration: dur, ease: "easeOut" }}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40">
              Carregando...
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 pointer-events-none"
          >
            <div
              className={`${pill} px-4 py-2 rounded-xl flex items-center gap-3 pointer-events-auto`}
            >
              <span className="font-mono text-lg font-semibold tabular-nums">
                {clock.toLocaleTimeString("pt-BR")}
              </span>
              <span className="text-xs text-white/60 hidden sm:inline">
                {current.advertiser_name}
              </span>
            </div>
            <div
              className={`${pill} px-3 py-2 rounded-xl flex items-center gap-2 text-xs`}
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />{" "}
                  Sincronizando...
                </>
              ) : online ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" /> Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-400" /> Modo
                  Offline · cache local
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-20"
          >
            <div className="h-1 bg-white/10">
              <motion.div
                key={index}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: dur, ease: "linear" }}
                className="h-full bg-indigo-500"
              />
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <Link
                to="/"
                className={`${pill} p-2.5 rounded-xl pointer-events-auto`}
                title="Sair do Modo Tablet"
              >
                <X className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIndex((i) => (i - 1 + total) % total)}
                  className={`${pill} p-2.5 rounded-xl pointer-events-auto`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span
                  className={`${pill} px-3 py-2 rounded-xl text-xs font-medium tabular-nums`}
                >
                  {(index % total) + 1} / {total}
                </span>
                <button
                  onClick={goNext}
                  className={`${pill} p-2.5 rounded-xl pointer-events-auto`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  onClick={sync}
                  className={`${pill} p-2.5 rounded-xl pointer-events-auto`}
                  title="Sincronizar agora"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
              <button
                onClick={toggleFullscreen}
                className={`${pill} p-2.5 rounded-xl pointer-events-auto`}
                title="Tela cheia"
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
