import { useMemo } from "react"
import { Link, useLocation } from "wouter"
import {
  Inbox, FolderOpen, TrendingUp, TrendingDown,
  AlertCircle, Clock, UserX, ArrowRight,
  Calendar, ChevronRight, Plus, DollarSign,
  PercentSquare, CreditCard,
} from "lucide-react"
import { useAppState, useFinancialKPIs } from "@/data/store"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { PHASE_LABELS } from "@/data/seed"
import type { Project } from "@/data/types"

// ── Helpers ───────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())
}

function healthColor(h: string) {
  return h === "saudavel" ? "text-emerald-400" : "text-amber-400"
}

// ── KPI Card ─────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  variant = "default",
  href,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  variant?: "default" | "positive" | "warning" | "danger"
  href?: string
}) {
  const variantClass = {
    default: "text-foreground",
    positive: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-rose-400",
  }[variant]

  const content = (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {href && (
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className={cn("text-2xl font-mono font-semibold tracking-tight", variantClass)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }
  return content
}

// ── Attention Item ────────────────────────────

function AttentionCard({
  icon: Icon,
  severity,
  title,
  description,
  href,
}: {
  icon: React.ElementType
  severity: "critical" | "warning"
  title: string
  description: string
  href: string
}) {
  const [, navigate] = useLocation()
  return (
    <button
      onClick={() => navigate(href)}
      className="w-full text-left flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-secondary/30 transition-all group"
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          severity === "critical"
            ? "bg-rose-500/10 text-rose-400"
            : "bg-amber-500/10 text-amber-400"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

// ── Project Mini-Card ─────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const [, navigate] = useLocation()
  return (
    <button
      onClick={() => navigate(`/projetos?id=${project.id}`)}
      className="text-left w-full p-4 rounded-xl border bg-card hover:bg-secondary/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight truncate">{project.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{project.client}</p>
        </div>
        <span
          className={cn(
            "shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full",
            project.health === "saudavel"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-400"
          )}
        >
          {project.health === "saudavel" ? "Saudável" : "Atenção"}
        </span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{PHASE_LABELS[project.phase]}</span>
          <span className="font-mono">{project.progress}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", project.health === "saudavel" ? "bg-primary" : "bg-amber-400")}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(project.dueDate)}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {project.responsible.split(" ")[0]}
        </span>
      </div>
    </button>
  )
}

// ── Page ─────────────────────────────────────

export default function OverviewPage() {
  const state = useAppState()
  const kpis = useFinancialKPIs(state)
  const [, navigate] = useLocation()

  const openDemands = state.demands.filter(d => d.status !== "cancelada")
  const activeProjects = state.projects

  const attentionItems = useMemo(() => {
    const items: {
      id: string
      icon: React.ElementType
      severity: "critical" | "warning"
      title: string
      description: string
      href: string
    }[] = []

    // Cost overrun projects
    state.projects
      .filter(p => p.health === "atencao" && p.healthNote?.toLowerCase().includes("custo"))
      .forEach(p =>
        items.push({
          id: `cost-${p.id}`,
          icon: TrendingUp,
          severity: "warning",
          title: `${p.id} — ${p.name.split("—")[0].trim()}`,
          description: p.healthNote!,
          href: `/projetos?id=${p.id}`,
        })
      )

    // Approval deadline projects
    state.projects
      .filter(p => p.health === "atencao" && p.healthNote?.toLowerCase().includes("aprovação"))
      .forEach(p =>
        items.push({
          id: `approval-${p.id}`,
          icon: Clock,
          severity: "critical",
          title: `${p.id} — ${p.name.split("—")[0].trim()}`,
          description: p.healthNote!,
          href: `/projetos?id=${p.id}`,
        })
      )

    // Overdue receivables
    state.financialEntries
      .filter(f => f.type === "receber" && f.status === "vencido")
      .forEach(f =>
        items.push({
          id: `fin-${f.id}`,
          icon: AlertCircle,
          severity: "critical",
          title: `Recebimento em atraso — ${f.clientOrSupplier}`,
          description: `${formatCurrency(f.amount)} · em atraso desde ${formatDate(f.dueDate)}`,
          href: `/financeiro?id=${f.id}`,
        })
      )

    // Unassigned demands
    state.demands
      .filter(d => !d.responsible && !["cancelada", "convertida"].includes(d.status))
      .forEach(d =>
        items.push({
          id: `demand-${d.id}`,
          icon: UserX,
          severity: "warning",
          title: `${d.id} — Sem responsável`,
          description: d.title,
          href: `/demandas?id=${d.id}`,
        })
      )

    return items
  }, [state.projects, state.financialEntries, state.demands])

  // Upcoming milestones: project tasks with future due dates
  const upcomingMilestones = useMemo(() => {
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 86400000)
    return state.projects
      .flatMap(p =>
        p.tasks
          .filter(t => !t.done && t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= in30)
          .map(t => ({ ...t, projectName: p.name.split("—")[0].trim(), projectId: p.id }))
      )
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
  }, [state.projects])

  const recentDemands = [...state.demands]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)

  return (
    <div className="h-full flex flex-col overflow-y-auto pb-16 md:pb-0">
      {/* Header */}
      <div className="px-6 md:px-8 py-6 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {greeting()}, Marina.
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">{todayLabel()}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => navigate("/demandas?new=1")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-sm font-medium text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Demanda</span>
            </button>
            <button
              onClick={() => navigate("/financeiro?new=1")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lançamento</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-6 space-y-8">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            icon={Inbox}
            label="Demandas abertas"
            value={openDemands.length}
            href="/demandas"
          />
          <KpiCard
            icon={FolderOpen}
            label="Projetos ativos"
            value={activeProjects.length}
            href="/projetos"
          />
          <KpiCard
            icon={TrendingUp}
            label="Receita prevista"
            value={formatCurrency(kpis.receitaPrevista)}
            variant="positive"
            href="/financeiro"
          />
          <KpiCard
            icon={TrendingDown}
            label="Despesas previstas"
            value={formatCurrency(kpis.despesasPrevistas)}
            variant="warning"
          />
          <KpiCard
            icon={PercentSquare}
            label="Margem prevista"
            value={`${kpis.margem.toFixed(1)}%`}
            variant={kpis.margem > 20 ? "positive" : "warning"}
          />
          <KpiCard
            icon={CreditCard}
            label="Pagamentos próximos"
            value={kpis.vencendoEmBreve.length}
            sub="vencendo em até 10 dias"
            variant={kpis.vencendoEmBreve.length > 0 ? "warning" : "default"}
            href="/financeiro"
          />
        </div>

        {/* Precisa de atenção */}
        {attentionItems.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/10">
                <AlertCircle className="h-3 w-3 text-rose-400" />
              </span>
              Precisa de atenção
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {attentionItems.length} {attentionItems.length === 1 ? "item" : "itens"}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {attentionItems.map(item => (
                <AttentionCard key={item.id} {...item} />
              ))}
            </div>
          </section>
        )}

        {/* Active projects + milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active projects */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Projetos em andamento</h2>
              <Link href="/projetos" className="text-xs text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeProjects.map(p => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>

          {/* Right column: milestones + recent demands */}
          <div className="space-y-6">
            {/* Upcoming milestones */}
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-3">Próximos marcos</h2>
              {upcomingMilestones.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum marco nos próximos 30 dias.</p>
              ) : (
                <div className="space-y-1">
                  {upcomingMilestones.map(m => (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/projetos?id=${m.projectId}`)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate leading-tight">{m.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.projectName}</p>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {formatDate(m.dueDate!)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Recent demands */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Demandas recentes</h2>
                <Link href="/demandas" className="text-xs text-primary hover:underline">
                  Ver todas
                </Link>
              </div>
              <div className="space-y-1">
                {recentDemands.map(d => (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/demandas?id=${d.id}`)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors group"
                  >
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-14 text-right">
                      {d.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate leading-tight">{d.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.client}</p>
                    </div>
                    <DemandStatusDot status={d.status} />
                  </button>
                ))}
              </div>
            </section>

            {/* Financial snapshot */}
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-3">Financeiro do mês</h2>
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <Row label="Receita prevista" value={formatCurrency(kpis.receitaPrevista)} valueClass="text-emerald-400" />
                <Row label="Receita recebida" value={formatCurrency(kpis.receitaRecebida)} />
                <div className="border-t border-border" />
                <Row label="Despesas previstas" value={formatCurrency(kpis.despesasPrevistas)} valueClass="text-rose-400" />
                <Row label="Despesas pagas" value={formatCurrency(kpis.despesasPagas)} />
                <div className="border-t border-border" />
                <Row label="Resultado previsto" value={formatCurrency(kpis.resultado)} valueClass={kpis.resultado >= 0 ? "text-emerald-400" : "text-rose-400"} />
                <Row label="Margem" value={`${kpis.margem.toFixed(1)}%`} valueClass="font-semibold text-foreground" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, valueClass = "text-muted-foreground font-mono" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs", valueClass)}>{value}</span>
    </div>
  )
}

const STATUS_DOT: Record<string, string> = {
  nova: "bg-blue-400",
  em_analise: "bg-yellow-400",
  aguardando_cliente: "bg-orange-400",
  aprovada: "bg-emerald-400",
  convertida: "bg-primary",
  cancelada: "bg-muted-foreground",
}

function DemandStatusDot({ status }: { status: string }) {
  return (
    <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status] ?? "bg-muted-foreground")} />
  )
}
