import { useState, useEffect, useMemo } from "react"
import { useSearch, useLocation } from "wouter"
import {
  LayoutGrid, List, X, Calendar, User, Building2,
  DollarSign, CheckSquare, Square, AlertCircle,
  Link as LinkIcon, TrendingUp, Clock, ChevronRight,
  Activity,
} from "lucide-react"
import { useAppState, useAppDispatch } from "@/data/store"
import { PHASE_LABELS, ALL_PHASES } from "@/data/seed"
import type { Project, ProjectPhaseId, FinancialEntry, Demand } from "@/data/types"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

// ── Health badge ──────────────────────────────

function HealthBadge({ health, note }: { health: string; note?: string }) {
  const isOk = health === "saudavel"
  return (
    <span
      title={note}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
        isOk
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
      )}
    >
      {isOk ? "Saudável" : "Atenção"}
    </span>
  )
}

// ── Phase badge ───────────────────────────────

function PhaseBadge({ phase }: { phase: ProjectPhaseId }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
      {PHASE_LABELS[phase]}
    </span>
  )
}

// ── Simple Tabs ───────────────────────────────

function SimpleTabs({
  tabs,
  children,
}: {
  tabs: string[]
  children: React.ReactNode[]
}) {
  const [active, setActive] = useState(0)
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex border-b border-border shrink-0 overflow-x-auto">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActive(i)}
            className={cn(
              "px-4 py-2.5 text-sm whitespace-nowrap transition-colors shrink-0",
              active === i
                ? "text-foreground border-b-2 border-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">{children[active]}</div>
    </div>
  )
}

// ── Phase Timeline ────────────────────────────

function PhaseTimeline({
  project,
}: {
  project: Project
}) {
  const phases = ALL_PHASES
  const currentIdx = phases.indexOf(project.phase as (typeof phases)[number])

  return (
    <div className="overflow-x-auto p-4">
      <div className="flex min-w-max gap-0">
        {phases.map((ph, i) => {
          const isPast = i < currentIdx
          const isCurrent = i === currentIdx
          const phaseData = project.phases.find(p => p.id === ph)

          return (
            <div key={ph} className="flex items-center">
              <div
                className={cn(
                  "flex flex-col items-center w-28 px-2 py-3 rounded-lg text-center text-xs",
                  isCurrent && "bg-primary/10 ring-1 ring-primary/30",
                  isPast && "opacity-60"
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center mb-1.5 text-[10px] font-semibold",
                    isCurrent ? "bg-primary text-primary-foreground" : isPast ? "bg-muted-foreground/30 text-muted-foreground" : "bg-secondary border border-border text-muted-foreground"
                  )}
                >
                  {i + 1}
                </div>
                <p className={cn("font-medium leading-tight", isCurrent ? "text-primary" : "text-muted-foreground")}>
                  {PHASE_LABELS[ph]}
                </p>
                {phaseData && (
                  <p className="text-[9px] text-muted-foreground mt-1 font-mono leading-tight">
                    {formatDate(phaseData.startDate)}<br />↓<br />{formatDate(phaseData.endDate)}
                  </p>
                )}
              </div>
              {i < phases.length - 1 && (
                <div className={cn("h-px w-4 shrink-0", i < currentIdx ? "bg-primary/40" : "bg-border")} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Project Detail Drawer ─────────────────────

function ProjectDrawer({
  project,
  linkedDemand,
  financialEntries,
  onClose,
  onToggleTask,
}: {
  project: Project
  linkedDemand?: Demand
  financialEntries: FinancialEntry[]
  onClose: () => void
  onToggleTask: (taskId: string) => void
}) {
  const doneTasks = project.tasks.filter(t => t.done).length
  const progress = project.tasks.length > 0 ? Math.round((doneTasks / project.tasks.length) * 100) : project.progress
  const margin = project.budget > 0 ? ((project.budget - project.realizedCost) / project.budget * 100) : 0

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-full max-w-xl flex-col bg-background border-l border-border shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-background sticky top-0 z-10 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{project.id} · {project.client}</p>
              <h2 className="text-base font-semibold text-foreground mt-0.5 leading-tight">{project.name}</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <PhaseBadge phase={project.phase} />
            <HealthBadge health={project.health} note={project.healthNote} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 min-h-0">
          <SimpleTabs tabs={["Visão Geral", "Etapas", "Tarefas", "Financeiro", "Histórico"]}>
            {/* Tab 0: Visão Geral */}
            <div className="p-6 space-y-4">
              {/* Health alert */}
              {project.health === "atencao" && project.healthNote && (
                <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-400">{project.healthNote}</p>
                </div>
              )}

              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3">
                <MiniKpi label="Orçamento" value={formatCurrency(project.budget)} />
                <MiniKpi label="Custo previsto" value={formatCurrency(project.plannedCost)} />
                <MiniKpi label="Custo realizado" value={formatCurrency(project.realizedCost)} valueClass={project.realizedCost > project.plannedCost ? "text-amber-400" : "text-foreground"} />
                <MiniKpi label="Margem estimada" value={`${margin.toFixed(1)}%`} valueClass={margin > 20 ? "text-emerald-400" : "text-amber-400"} />
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Progresso geral</span>
                  <span className="font-mono">{project.progress}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", project.health === "saudavel" ? "bg-primary" : "bg-amber-400")}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <InfoRow icon={User} label="Responsável" value={project.responsible} />
                <InfoRow icon={Calendar} label="Prazo" value={formatDate(project.dueDate)} />
              </div>

              {/* Origin demand link */}
              {linkedDemand && (
                <div className="rounded-lg bg-secondary/50 border border-border p-3 flex items-center gap-2">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Demanda de origem</p>
                    <p className="text-sm font-medium text-foreground truncate">
                      {linkedDemand.id} — {linkedDemand.title}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tab 1: Etapas */}
            <div>
              {project.phases.length > 0 ? (
                <PhaseTimeline project={project} />
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Fases ainda não definidas para este projeto.
                </div>
              )}
            </div>

            {/* Tab 2: Tarefas */}
            <div className="p-4">
              {project.tasks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhuma tarefa cadastrada.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <span>{doneTasks} de {project.tasks.length} tarefas concluídas</span>
                    <span className="font-mono">{Math.round((doneTasks / project.tasks.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(doneTasks / project.tasks.length) * 100}%` }} />
                  </div>
                  <div className="space-y-1">
                    {project.tasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => onToggleTask(task.id)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left group"
                      >
                        {task.done
                          ? <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          : <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground" />
                        }
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm leading-tight", task.done ? "text-muted-foreground line-through" : "text-foreground")}>
                            {task.title}
                          </p>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{task.responsible}</span>
                            {task.dueDate && (
                              <span className="text-[10px] text-muted-foreground font-mono">{formatDate(task.dueDate)}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Tab 3: Financeiro */}
            <div className="p-4">
              {financialEntries.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhum lançamento vinculado a este projeto.
                </div>
              ) : (
                <div className="space-y-2">
                  {financialEntries.map(f => (
                    <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border text-sm">
                      <span className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        f.status === "pago" || f.status === "recebido" ? "bg-emerald-400" :
                        f.status === "vencido" ? "bg-rose-400" : "bg-amber-400"
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-xs">{f.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{f.clientOrSupplier} · {f.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-xs font-mono font-medium", f.type === "receber" ? "text-emerald-400" : "text-rose-400")}>
                          {f.type === "receber" ? "+" : "-"}{formatCurrency(f.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(f.dueDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tab 4: Histórico */}
            <div className="p-4">
              {project.history.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhum registro no histórico.
                </div>
              ) : (
                <div className="space-y-0">
                  {[...project.history].reverse().map((h, i) => (
                    <div key={h.id} className="flex gap-2 text-xs">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="h-2 w-2 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                        {i < project.history.length - 1 && <div className="w-px flex-1 bg-border/50 my-0.5" />}
                      </div>
                      <div className="pb-3">
                        <span className="text-foreground">{h.action}</span>
                        <span className="text-muted-foreground"> · {h.author} · {formatDate(h.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SimpleTabs>
        </div>
      </div>
    </>
  )
}

function MiniKpi({ label, value, valueClass = "text-foreground" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-sm font-mono font-semibold", valueClass)}>{value}</p>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

// ── Project Card ──────────────────────────────

function ProjectCard({ project, onSelect }: { project: Project; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="text-left w-full p-4 rounded-xl border bg-card hover:bg-secondary/20 transition-all group shadow-sm hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-muted-foreground">{project.id}</p>
          <p className="text-sm font-semibold text-foreground leading-tight mt-0.5">{project.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{project.client}</p>
        </div>
        <HealthBadge health={project.health} />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <PhaseBadge phase={project.phase} />
          <span className="font-mono">{project.progress}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", project.health === "saudavel" ? "bg-primary" : "bg-amber-400")}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {project.responsible.split(" ")[0]} {project.responsible.split(" ").slice(-1)[0]}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(project.dueDate)}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(project.budget)}
        </span>
        <span className={cn("flex items-center gap-1", project.realizedCost > project.plannedCost && "text-amber-400")}>
          <TrendingUp className="h-3 w-3" />
          {formatCurrency(project.realizedCost)}
        </span>
      </div>
    </button>
  )
}

// ── Page ─────────────────────────────────────

export default function ProjectsPage() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const search = useSearch()

  const [view, setView] = useState<"cards" | "list">("cards")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(search)
    const id = params.get("id")
    if (id) setSelectedId(id)
  }, [search])

  const selectedProject = selectedId ? state.projects.find(p => p.id === selectedId) : null
  const linkedDemand = selectedProject?.demandId ? state.demands.find(d => d.id === selectedProject.demandId) : undefined
  const projectFinancials = useMemo(
    () => selectedProject ? state.financialEntries.filter(f => f.projectId === selectedProject.id) : [],
    [selectedProject, state.financialEntries]
  )

  const healthy = state.projects.filter(p => p.health === "saudavel").length
  const atencao = state.projects.filter(p => p.health === "atencao").length

  return (
    <div className="h-full flex flex-col bg-background pb-16 md:pb-0">
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Projetos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {state.projects.length} ativos · <span className="text-emerald-400">{healthy} saudáveis</span>
              {atencao > 0 && <> · <span className="text-amber-400">{atencao} requerem atenção</span></>}
            </p>
          </div>
          {/* View toggle */}
          <div className="flex gap-0.5 bg-secondary/50 p-1 rounded-md border border-border">
            <button
              onClick={() => setView("cards")}
              className={cn("p-1.5 rounded transition-colors", view === "cards" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("p-1.5 rounded transition-colors", view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 md:px-8 py-4">
        {view === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {state.projects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={() => setSelectedId(p.id)} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                  {["ID", "Projeto", "Cliente", "Fase", "Progresso", "Saúde", "Responsável", "Prazo", "Orçamento"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.projects.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px]">
                      <span className="truncate block">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.client}</td>
                    <td className="px-4 py-3"><PhaseBadge phase={p.phase} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><HealthBadge health={p.health} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.responsible}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDate(p.dueDate)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground text-right">{formatCurrency(p.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedProject && (
        <ProjectDrawer
          project={selectedProject}
          linkedDemand={linkedDemand}
          financialEntries={projectFinancials}
          onClose={() => setSelectedId(null)}
          onToggleTask={taskId =>
            dispatch({ type: "TOGGLE_PROJECT_TASK", payload: { projectId: selectedProject.id, taskId } })
          }
        />
      )}
    </div>
  )
}
