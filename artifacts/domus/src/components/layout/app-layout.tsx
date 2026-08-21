import { type ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { MobileNav } from "./mobile-nav"

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground dark">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col relative min-w-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
