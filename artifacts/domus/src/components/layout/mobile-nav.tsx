import { Link, useLocation } from "wouter"
import { LayoutDashboard, Inbox, FolderOpen, Wallet, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { title: "Geral", href: "/", icon: LayoutDashboard },
  { title: "Demandas", href: "/demandas", icon: Inbox },
  { title: "Projetos", href: "/projetos", icon: FolderOpen },
  { title: "Financeiro", href: "/financeiro", icon: Wallet },
  { title: "AI", href: "/domus-ai", icon: Sparkles },
]

export function MobileNav() {
  const [location] = useLocation()
  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href)

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-sidebar/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const isAI = item.href === "/domus-ai"
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center",
                isAI && active && "bg-primary/10 rounded-lg px-2 py-0.5"
              )}>
                <item.icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              </div>
              {item.title}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
