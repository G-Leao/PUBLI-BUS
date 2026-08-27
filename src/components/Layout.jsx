import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Bus,
  LayoutDashboard,
  Megaphone,
  Images,
  Tablet as TabletIcon,
  HelpCircle,
  Settings as SettingsIcon,
  PlayCircle,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/anunciantes", label: "Anunciantes", icon: Megaphone },
  { to: "/campanhas", label: "Campanhas", icon: Images },
  { to: "/tablets", label: "Tablets", icon: TabletIcon },
  { to: "/central-ajuda", label: "Central de Ajuda", icon: HelpCircle },
  { to: "/configuracoes", label: "Configurações", icon: SettingsIcon },
  { to: "/player", label: "Modo Tablet", icon: PlayCircle },
];

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-black/5 dark:border-white/10">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Bus className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-semibold leading-tight">PubliBus</p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Gestão de Mídia
          </p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-foreground border border-indigo-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-black/5 dark:border-white/10">
        <div className="glass rounded-xl p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-0.5">Plano Enterprise</p>
          <p>Suporte e manutenção inclusos</p>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const current =
    navItems.find((n) => n.to !== "/" && location.pathname.startsWith(n.to)) ||
    navItems.find((n) => n.to === "/");

  return (
    <div className="min-h-screen">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 glass z-40">
        <SidebarContent />
      </aside>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 glass z-50 lg:hidden">
            <button
              className="absolute top-4 right-4 z-10"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 glass h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-semibold">{current?.label}</h2>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600" />
          </div>
        </header>
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
