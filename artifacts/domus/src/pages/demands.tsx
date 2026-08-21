import { useState, useEffect, useMemo } from "react"
import { useSearch, useLocation } from "wouter"
import {
  Plus, Search, LayoutGrid, List, X, ChevronRight,
  Calendar, User, Building2, DollarSign,
  Clock, MessageSquare, Paperclip, History,
  ArrowRightCircle, CheckCircle2, AlertCircle,
  Filter, FileText, Link as LinkIcon,
} from "lucide-react"
import { useAppState, useAppDispatch } from "@/data/store"
import { TEAM_MEMBERS, PHASE_LABELS } from "@/data/seed"
import type { Demand, DemandStatus, DemandPriority, Project } from "@/data/types"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

// ── Label maps ────────────────────────────────

const STATUS_LABELS: Record<DemandStatus, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  aguardando_cliente: "Aguardando cliente",
  aprovada: "Aprovada",
  convertida: "Convertida em projeto",
  cancelada: "Cancelada",
}

const STATUS_COLOR: Record<DemandStatus, string> = {
  nova: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  em_analise: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  aguardando_cliente: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  aprovada: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  convertida: "bg-primary/10 text-primary border-primary/20",
  cancelada: "bg-muted text-muted-foreground border-border",
}

const PRIORITY_LABELS: Record<DemandPriority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
}

const PRIORITY_COLOR: Record<DemandPriority, string> = {
  urgente: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  alta: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  media: "bg-primary/10 text-primary border-primary/20",
  baixa: "bg-muted text-muted-foreground border-border",
}

const ALL_STATUSES = Object.keys(STATUS_LABELS) as DemandStatus[]

// ── Status Badge ──────────────────────────────

function StatusBadge({ status }: { status: DemandStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", STATUS_COLOR[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: DemandPriority }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", PRIORITY_COLOR[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

// ── Convert confirm dialog ────────────────────

function ConvertDialog({
  demand,
  onConfirm,
  onCancel,
}: {
  demand: Demand
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ArrowRightCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Converter em projeto</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{demand.id} — {demand.title}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Um projeto será criado a partir desta demanda. O status da demanda mudará para{" "}
          <span className="text-foreground font-medium">Convertida em projeto</span>.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Criar projeto
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Demand Form ───────────────────────────────

type DemandFormData = {
  title: string
  client: string
  responsible: string
  priority: DemandPriority
  status: DemandStatus
  dueDate: string
  estimatedValue: string
  description: string
  origin: string
}

function DemandForm({
  initial,
  onSave,
  onCancel,
  title: formTitle,
}: {
  initial?: Partial<DemandFormData>
  onSave: (data: DemandFormData) => void
  onCancel: () => void
  title: string
}) {
  const [form, setForm] = useState<DemandFormData>({
    title: initial?.title ?? "",
    client: initial?.client ?? "",
    responsible: initial?.responsible ?? "",
    priority: initial?.priority ?? "media",
    status: initial?.status ?? "nova",
    dueDate: initial?.dueDate ?? "",
    estimatedValue: initial?.estimatedValue ?? "",
    description: initial?.description ?? "",
    origin: initial?.origin ?? "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof DemandFormData, string>>>({})

  function validate() {
    const e: Partial<Record<keyof DemandFormData, string>> = {}
    if (!form.title.trim()) e.title = "Título obrigatório"
    if (!form.client.trim()) e.client = "Cliente obrigatório"
    return e
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onSave(form)
  }

  const f = (k: keyof DemandFormData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(p => ({ ...p, [k]: ev.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{formTitle}</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <Field label="Título" error={errors.title}>
            <input className={inputCls} value={form.title} onChange={f("title")} placeholder="Ex: Reforma do escritório XYZ" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente" error={errors.client}>
              <input className={inputCls} value={form.client} onChange={f("client")} placeholder="Nome do cliente" />
            </Field>
            <Field label="Responsável">
              <select className={inputCls} value={form.responsible} onChange={f("responsible")}>
                <option value="">Não definido</option>
                {TEAM_MEMBERS.filter(m => m.id !== "marina-costa").map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prioridade">
              <select className={inputCls} value={form.priority} onChange={f("priority")}>
                {(Object.entries(PRIORITY_LABELS) as [DemandPriority, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={f("status")}>
                {(Object.entries(STATUS_LABELS) as [DemandStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo">
              <input className={inputCls} type="date" value={form.dueDate} onChange={f("dueDate")} />
            </Field>
            <Field label="Valor estimado (R$)">
              <input className={inputCls} type="number" min="0" value={form.estimatedValue} onChange={f("estimatedValue")} placeholder="0" />
            </Field>
          </div>
          <Field label="Origem">
            <input className={inputCls} value={form.origin} onChange={f("origin")} placeholder="Como surgiu esta demanda?" />
          </Field>
          <Field label="Descrição">
            <textarea className={cn(inputCls, "h-20 resize-none")} value={form.description} onChange={f("description")} placeholder="Detalhes da demanda..." />
          </Field>
          <div className="pt-2 flex justify-end gap-2 border-t border-border">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

const inputCls = "w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"

// ── Demand Detail Drawer ──────────────────────

function DemandDrawer({
  demand,
  linkedProject,
  onClose,
  onEdit,
  onStatusChange,
  onConvert,
}: {
  demand: Demand
  linkedProject?: Project
  onClose: () => void
  onEdit: () => void
  onStatusChange: (s: DemandStatus) => void
  onConvert: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-full max-w-lg flex-col bg-background border-l border-border shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{demand.id}</p>
              <h2 className="text-base font-semibold text-foreground mt-0.5 leading-tight">{demand.title}</h2>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={onEdit} className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors">Editar</button>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <StatusBadge status={demand.status} />
            <PriorityBadge priority={demand.priority} />
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <InfoRow icon={Building2} label="Cliente" value={demand.client} />
            <InfoRow icon={User} label="Responsável" value={demand.responsible ?? "Não definido"} />
            <InfoRow icon={Calendar} label="Prazo" value={demand.dueDate ? formatDate(demand.dueDate) : "—"} />
            <InfoRow icon={DollarSign} label="Valor estimado" value={formatCurrency(demand.estimatedValue)} />
            <InfoRow icon={FileText} label="Origem" value={demand.origin || "—"} />
          </div>

          {demand.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm text-foreground leading-relaxed">{demand.description}</p>
            </div>
          )}

          {/* Linked project */}
          {linkedProject && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center gap-2">
              <LinkIcon className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Projeto originado</p>
                <p className="text-sm font-medium text-primary truncate">{linkedProject.id} — {linkedProject.name}</p>
              </div>
            </div>
          )}

          {/* Status change */}
          {demand.status !== "convertida" && demand.status !== "cancelada" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Alterar status</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.filter(s => s !== "convertida" && s !== demand.status).map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className="px-2.5 py-1 rounded-full text-[11px] border transition-colors hover:bg-secondary"
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Convert to project — only if not already linked to one */}
          {demand.status === "aprovada" && !demand.projectId && (
            <button
              onClick={onConvert}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <ArrowRightCircle className="h-4 w-4" />
              Converter em projeto
            </button>
          )}

          {/* Files */}
          {demand.files.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> Arquivos ({demand.files.length})
              </p>
              <div className="space-y-1.5">
                {demand.files.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate text-foreground flex-1">{f.name}.{f.ext}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{f.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {demand.comments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Comentários ({demand.comments.length})
              </p>
              <div className="space-y-3">
                {demand.comments.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                      {c.authorInitials}
                    </div>
                    <div className="flex-1 bg-secondary/40 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-foreground">{c.author}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{formatDate(c.createdAt)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {demand.history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <History className="h-3 w-3" /> Histórico
              </p>
              <div className="space-y-0">
                {[...demand.history].reverse().map((h, i) => (
                  <div key={h.id} className="flex gap-2 text-xs">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-border mt-1.5 shrink-0" />
                      {i < demand.history.length - 1 && <div className="w-px flex-1 bg-border/50 my-0.5" />}
                    </div>
                    <div className="pb-3">
                      <span className="text-foreground">{h.action}</span>
                      <span className="text-muted-foreground"> · {h.author} · {formatDate(h.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
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

// ── List View ─────────────────────────────────

function ListView({ demands, onSelect }: { demands: Demand[]; onSelect: (id: string) => void }) {
  if (demands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
        <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhuma demanda encontrada.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="border-b border-border">
            {["ID", "Título", "Cliente", "Prioridade", "Status", "Responsável", "Prazo", "Valor"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {demands.map(d => (
            <tr
              key={d.id}
              onClick={() => onSelect(d.id)}
              className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors group"
            >
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.id}</td>
              <td className="px-4 py-3 max-w-[200px]">
                <span className="text-foreground font-medium truncate block">{d.title}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{d.client}</td>
              <td className="px-4 py-3"><PriorityBadge priority={d.priority} /></td>
              <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
              <td className="px-4 py-3 text-muted-foreground">{d.responsible ?? <span className="text-rose-400 text-xs">Não definido</span>}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {d.dueDate ? formatDate(d.dueDate) : "—"}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-right text-foreground">
                {d.estimatedValue ? formatCurrency(d.estimatedValue) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Board View ────────────────────────────────

function BoardView({ demands, onSelect }: { demands: Demand[]; onSelect: (id: string) => void }) {
  const columns: DemandStatus[] = ["nova", "em_analise", "aguardando_cliente", "aprovada", "convertida", "cancelada"]

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
      {columns.map(status => {
        const col = demands.filter(d => d.status === status)
        return (
          <div key={status} className="flex flex-col w-[260px] shrink-0">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className={cn("h-2 w-2 rounded-full", STATUS_COLOR[status].split(" ")[0])} />
              <span className="text-xs font-medium text-foreground">{STATUS_LABELS[status]}</span>
              <span className="ml-auto text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="flex-1 space-y-2 rounded-xl bg-secondary/20 border border-border/50 p-2 min-h-[120px]">
              {col.map(d => (
                <button
                  key={d.id}
                  onClick={() => onSelect(d.id)}
                  className="w-full text-left p-3 rounded-lg bg-card border border-border hover:border-border/80 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <PriorityBadge priority={d.priority} />
                    <span className="text-[10px] font-mono text-muted-foreground">{d.id}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-snug mb-1">{d.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{d.client}</p>
                  <div className="flex items-center justify-between">
                    {d.dueDate && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" />
                        {formatDate(d.dueDate)}
                      </span>
                    )}
                    {d.responsible ? (
                      <span className="text-[10px] text-muted-foreground">{d.responsible.split(" ")[0]}</span>
                    ) : (
                      <span className="text-[10px] text-rose-400">Sem resp.</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ─────────────────────────────────────

export default function DemandsPage() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const search = useSearch()
  const [, navigate] = useLocation()

  const [view, setView] = useState<"list" | "board">("list")
  const [searchText, setSearchText] = useState("")
  const [filterStatus, setFilterStatus] = useState<DemandStatus | "">("")
  const [filterPriority, setFilterPriority] = useState<DemandPriority | "">("")
  const [filterClient, setFilterClient] = useState("")
  const [filterResponsible, setFilterResponsible] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null)
  const [convertingDemand, setConvertingDemand] = useState<Demand | null>(null)

  // Open demand from URL param
  useEffect(() => {
    const params = new URLSearchParams(search)
    const id = params.get("id")
    if (id) setSelectedId(id)
    if (params.get("new") === "1") setIsCreating(true)
  }, [search])

  const clients = useMemo(() => [...new Set(state.demands.map(d => d.client))].sort(), [state.demands])
  const responsibles = useMemo(() => [...new Set(state.demands.map(d => d.responsible).filter(Boolean))].sort() as string[], [state.demands])

  const filtered = useMemo(() => {
    return state.demands.filter(d => {
      if (searchText && !d.title.toLowerCase().includes(searchText.toLowerCase()) && !d.id.includes(searchText)) return false
      if (filterStatus && d.status !== filterStatus) return false
      if (filterPriority && d.priority !== filterPriority) return false
      if (filterClient && d.client !== filterClient) return false
      if (filterResponsible && d.responsible !== filterResponsible) return false
      return true
    })
  }, [state.demands, searchText, filterStatus, filterPriority, filterClient, filterResponsible])

  const selectedDemand = selectedId ? state.demands.find(d => d.id === selectedId) : null
  const linkedProject = selectedDemand?.projectId ? state.projects.find(p => p.id === selectedDemand.projectId) : undefined

  function handleSave(data: DemandFormData) {
    const d = data
    if (editingDemand) {
      dispatch({
        type: "UPDATE_DEMAND",
        payload: {
          id: editingDemand.id,
          updates: {
            title: d.title,
            client: d.client,
            responsible: d.responsible || null,
            priority: d.priority,
            status: d.status,
            dueDate: d.dueDate,
            estimatedValue: parseFloat(d.estimatedValue) || 0,
            description: d.description,
            origin: d.origin,
          },
        },
      })
      setEditingDemand(null)
    } else {
      const newId = `D-${1049 + state.demands.filter(x => x.id.startsWith("D-1")).length}`
      dispatch({
        type: "CREATE_DEMAND",
        payload: {
          id: newId,
          title: d.title,
          client: d.client,
          responsible: d.responsible || null,
          priority: d.priority,
          status: d.status,
          dueDate: d.dueDate,
          estimatedValue: parseFloat(d.estimatedValue) || 0,
          description: d.description,
          origin: d.origin,
          projectId: undefined,
          comments: [],
          history: [{ id: "h-new", action: "Demanda criada", author: "Marina Costa", createdAt: new Date().toISOString().split("T")[0] }],
          files: [],
          createdAt: new Date().toISOString().split("T")[0],
        },
      })
      setIsCreating(false)
    }
  }

  function handleConvert() {
    if (!convertingDemand) return
    const maxId = Math.max(...state.projects.map(p => parseInt(p.id.split("-")[1] ?? "200")))
    const newProjectId = `P-${maxId + 1}`
    const today = new Date().toISOString().split("T")[0]
    const newProject: Project = {
      id: newProjectId,
      name: convertingDemand.title,
      client: convertingDemand.client,
      responsible: convertingDemand.responsible ?? "Rafael Nunes",
      phase: "planejamento",
      progress: 0,
      dueDate: convertingDemand.dueDate,
      budget: convertingDemand.estimatedValue,
      plannedCost: Math.round(convertingDemand.estimatedValue * 0.65),
      realizedCost: 0,
      health: "saudavel",
      demandId: convertingDemand.id,
      tasks: [],
      phases: [],
      history: [{ id: "ph-new", action: `Projeto criado a partir da ${convertingDemand.id}`, author: "Marina Costa", createdAt: today }],
    }
    dispatch({ type: "CONVERT_DEMAND", payload: { demandId: convertingDemand.id, project: newProject } })
    setConvertingDemand(null)
    setSelectedId(null)
    navigate(`/projetos?id=${newProjectId}`)
  }

  const hasFilters = filterStatus || filterPriority || filterClient || filterResponsible

  return (
    <div className="h-full flex flex-col bg-background pb-16 md:pb-0">
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Demandas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} de {state.demands.length} demandas
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova demanda
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Buscar demanda..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Filters */}
          <select className={cn(inputCls, "w-auto py-2")} value={filterStatus} onChange={e => setFilterStatus(e.target.value as DemandStatus | "")}>
            <option value="">Todos os status</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select className={cn(inputCls, "w-auto py-2")} value={filterPriority} onChange={e => setFilterPriority(e.target.value as DemandPriority | "")}>
            <option value="">Toda prioridade</option>
            {(Object.entries(PRIORITY_LABELS) as [DemandPriority, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className={cn(inputCls, "w-auto py-2")} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">Todos os clientes</option>
            {clients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={() => { setFilterStatus(""); setFilterPriority(""); setFilterClient(""); setFilterResponsible("") }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}

          {/* View toggle */}
          <div className="ml-auto flex gap-0.5 bg-secondary/50 p-1 rounded-md border border-border">
            <button onClick={() => setView("list")} className={cn("p-1.5 rounded transition-colors", view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setView("board")} className={cn("p-1.5 rounded transition-colors", view === "board" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 md:px-8 py-4">
        {view === "list"
          ? <ListView demands={filtered} onSelect={setSelectedId} />
          : <BoardView demands={filtered} onSelect={setSelectedId} />
        }
      </div>

      {/* Detail drawer */}
      {selectedDemand && (
        <DemandDrawer
          demand={selectedDemand}
          linkedProject={linkedProject}
          onClose={() => setSelectedId(null)}
          onEdit={() => { setEditingDemand(selectedDemand); setSelectedId(null) }}
          onStatusChange={(s) => {
            dispatch({ type: "UPDATE_DEMAND", payload: { id: selectedDemand.id, updates: { status: s } } })
            setSelectedId(null)
          }}
          onConvert={() => { setConvertingDemand(selectedDemand); setSelectedId(null) }}
        />
      )}

      {/* Modals */}
      {(isCreating || editingDemand) && (
        <DemandForm
          title={editingDemand ? "Editar demanda" : "Nova demanda"}
          initial={editingDemand ? {
            title: editingDemand.title,
            client: editingDemand.client,
            responsible: editingDemand.responsible ?? "",
            priority: editingDemand.priority,
            status: editingDemand.status,
            dueDate: editingDemand.dueDate,
            estimatedValue: String(editingDemand.estimatedValue),
            description: editingDemand.description,
            origin: editingDemand.origin,
          } : undefined}
          onSave={handleSave}
          onCancel={() => { setIsCreating(false); setEditingDemand(null) }}
        />
      )}

      {convertingDemand && (
        <ConvertDialog
          demand={convertingDemand}
          onConfirm={handleConvert}
          onCancel={() => setConvertingDemand(null)}
        />
      )}
    </div>
  )
}
