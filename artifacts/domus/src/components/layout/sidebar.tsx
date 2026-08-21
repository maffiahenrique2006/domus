import { Link, useLocation } from "wouter"
import {
  LayoutDashboard,
  Inbox,
  FolderOpen,
  Wallet,
  Triangle,
  LogOut,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { title: "Visão Geral", href: "/", icon: LayoutDashboard },
  { title: "Demandas", href: "/demandas", icon: Inbox },
  { title: "Projetos", href: "/projetos", icon: FolderOpen },
  { title: "Financeiro", href: "/financeiro", icon: Wallet },
]

export function Sidebar() {
  const [location] = useLocation()

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href)

  const aiActive = location.startsWith("/domus-ai")

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Triangle className="h-4 w-4 fill-current" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight truncate">
            Vértice Espaços
          </p>
          <p className="text-[10px] text-muted-foreground font-mono leading-tight mt-0.5">
            Domus System
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.title}
            </Link>
          )
        })}

        {/* Divider */}
        <div className="pt-3 pb-1">
          <div className="border-t border-border/50 mb-3" />
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
            Inteligência
          </p>
          <Link
            href="/domus-ai"
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
              aiActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Sparkles
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                aiActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            Domus AI
            <span className={cn(
              "ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
              aiActive
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-secondary text-muted-foreground border-border"
            )}>
              DEMO
            </span>
          </Link>
        </div>
      </nav>

      {/* User chip */}
      <div className="border-t border-border/50 px-3 py-4 space-y-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-secondary/50 transition-colors group cursor-pointer">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
            MC
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground leading-tight truncate">
              Marina Costa
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
              Diretora-geral
            </p>
          </div>
          <LogOut className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        <p className="px-2 text-[10px] text-muted-foreground leading-relaxed font-mono">
          Domus System configurado para a operação da Vértice Espaços.
        </p>
      </div>
    </aside>
  )
}
