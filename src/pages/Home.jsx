import { useEffect, useState } from "react";
import { localClient } from "@/API/localClient";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Loading } from "@/components/Loading";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wifi,
  WifiOff,
  Images,
  Megaphone,
  RefreshCw,
  Bus,
  PlayCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const tabletStatusMap = {
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

export default function Home() {
  const [tablets, setTablets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      localClient.entities.Tablet.list(),
      localClient.entities.Campaign.list(),
      localClient.entities.Advertiser.list(),
    ])
      .then(([t, c, a]) => {
        setTablets(t);
        setCampaigns(c);
        setAdvertisers(a);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const online = tablets.filter((t) => t.status === "online").length;
  const offline = tablets.filter((t) => t.status === "offline").length;
  const maint = tablets.filter((t) => t.status === "maintenance").length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const syncedToday = tablets.filter(
    (t) => t.last_sync && new Date(t.last_sync).getTime() > dayAgo,
  ).length;

  const chartData = [
    { name: "Online", value: online, color: "#10b981" },
    { name: "Offline", value: offline, color: "#ef4444" },
    { name: "Manutenção", value: maint, color: "#f59e0b" },
  ];

  const recentTablets = [...tablets]
    .sort(
      (a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Link
        to="/player"
        className="glass-card p-4 flex items-center justify-between gap-4 group hover:ring-2 hover:ring-indigo-500/40 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <PlayCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold">Modo Tablet</p>
            <p className="text-sm text-muted-foreground">
              Veja as propagandas rodando em tela cheia, como no ônibus
            </p>
          </div>
        </div>
        <span className="text-sm text-indigo-500 group-hover:translate-x-1 transition-transform">
          Abrir →
        </span>
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Wifi}
          label="Tablets Online"
          value={online}
          hint={`${tablets.length} no total`}
          accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={WifiOff}
          label="Tablets Offline"
          value={offline}
          hint="Requerem atenção"
          accent="bg-red-500/15 text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={Images}
          label="Campanhas Ativas"
          value={activeCampaigns}
          hint={`${campaigns.length} cadastradas`}
          accent="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          icon={Megaphone}
          label="Anunciantes"
          value={advertisers.length}
          hint="empresas cadastradas"
          accent="bg-violet-500/15 text-violet-600 dark:text-violet-400"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="font-semibold mb-4">Status dos Tablets</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {chartData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tablets Recentes</h3>
            <Link
              to="/tablets"
              className="text-sm text-indigo-500 hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {recentTablets.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Bus className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {t.bus || "—"} · {t.line || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Patrimônio {t.patrimonio}
                    </p>
                  </div>
                </div>
                <StatusBadge status={t.status} map={tabletStatusMap} />
              </div>
            ))}
            {recentTablets.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum tablet cadastrado
              </p>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold">Sincronização</h3>
            <p className="text-sm text-muted-foreground">
              {syncedToday} de {tablets.length} tablets sincronizados nas
              últimas 24h
            </p>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
            style={{
              width: `${tablets.length ? (syncedToday / tablets.length) * 100 : 0}%`,
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
