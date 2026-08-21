import { useState, useEffect, useMemo } from "react"
import { useSearch } from "wouter"
import {
  Plus, X, TrendingUp, TrendingDown, AlertCircle,
  CheckCircle2, Clock, ChevronRight, Building2,
  Calendar, DollarSign, Link as LinkIcon, Filter,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useAppState, useAppDispatch, useFinancialKPIs } from "@/data/store"
import { TEAM_MEMBERS } from "@/data/seed"
import type { FinancialEntry, FinancialStatus, FinancialType } from "@/data/types"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

// ── Status badge ──────────────────────────────

const STATUS_LABEL: Record<FinancialStatus, string> = {
  pendente: "Pendente",
  vencido: "Vencido",
  pago: "Pago",
  recebido: "Recebido",
}

const STATUS_COLOR: Record<FinancialStatus, string> = {
  pendente: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  vencido: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  pago: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  recebido: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

function FinancialStatusBadge({ status }: { status: FinancialStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", STATUS_COLOR[status])}>
      {status === "vencido" && <AlertCircle className="h-3 w-3" />}
      {(status === "pago" || status === "recebido") && <CheckCircle2 className="h-3 w-3" />}
      {status === "pendente" && <Clock className="h-3 w-3" />}
      {STATUS_LABEL[status]}
    </span>
  )
}

// ── KPI Card ─────────────────────────────────

function KpiCard({ label, value, sub, variant = "default" }: {
  label: string; value: string; sub?: string; variant?: "default" | "positive" | "negative" | "warning"
}) {
  const cls = { default: "text-foreground", positive: "text-emerald-400", negative: "text-rose-400", warning: "text-amber-400" }[variant]
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[11px] text-muted-foreground font-medium mb-1">{label}</p>
      <p className={cn("text-lg font-mono font-semibold tracking-tight", cls)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Entry Detail Drawer ───────────────────────

function EntryDrawer({
  entry,
  projectName,
  onClose,
  onMarkPaid,
}: {
  entry: FinancialEntry
  projectName?: string
  onClose: () => void
  onMarkPaid: () => void
}) {
  const canMark = entry.status === "pendente" || entry.status === "vencido"
  const actionLabel = entry.type === "receber" ? "Marcar como recebido" : "Marcar como pago"

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col bg-background border-l border-border shadow-2xl overflow-y-auto">
        <div className="px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{entry.id}</p>
              <h2 className="text-base font-semibold text-foreground mt-0.5 leading-tight">{entry.description}</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2">
            <FinancialStatusBadge status={entry.status} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Amount */}
          <div className="text-center py-4">
            <p className="text-3xl font-mono font-bold tracking-tight">
              <span className={entry.type === "receber" ? "text-emerald-400" : "text-rose-400"}>
                {entry.type === "receber" ? "+" : "-"}{formatCurrency(entry.amount)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {entry.type === "receber" ? "A receber" : "A pagar"}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <DetailRow icon={Building2} label="Cliente / Fornecedor" value={entry.clientOrSupplier} />
            <DetailRow icon={Calendar} label="Vencimento" value={formatDate(entry.dueDate)} />
            <DetailRow icon={Filter} label="Categoria" value={entry.category} />
            {entry.paidAt && (
              <DetailRow icon={CheckCircle2} label={entry.type === "receber" ? "Recebido em" : "Pago em"} value={formatDate(entry.paidAt)} />
            )}
            {projectName && (
              <div className="flex items-start gap-2">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Projeto</p>
                  <p className="text-sm text-foreground">{entry.projectId} — {projectName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Overdue alert */}
          {entry.status === "vencido" && (
            <div className="flex gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-400">Pagamento em atraso desde {formatDate(entry.dueDate)}. Entre em contato com o cliente.</p>
            </div>
          )}

          {/* Action */}
          {canMark && (
            <button
              onClick={onMarkPaid}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

// ── Entry Row ─────────────────────────────────

function EntryRow({ entry, projectName, onSelect }: { entry: FinancialEntry; projectName?: string; onSelect: () => void }) {
  const isOverdue = entry.status === "vencido"
  return (
    <tr
      onClick={onSelect}
      className={cn(
        "border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors",
        isOverdue && "bg-rose-500/5"
      )}
    >
      <td className="px-4 py-3 text-sm">
        <p className="text-foreground font-medium truncate max-w-[200px]">{entry.description}</p>
        {isOverdue && (
          <p className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
            <AlertCircle className="h-3 w-3" /> Em atraso
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{entry.clientOrSupplier}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{projectName ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDate(entry.dueDate)}</td>
      <td className="px-4 py-3"><FinancialStatusBadge status={entry.status} /></td>
      <td className="px-4 py-3 text-right">
        <span className={cn("font-mono text-sm font-medium", entry.type === "receber" ? "text-emerald-400" : "text-rose-400")}>
          {formatCurrency(entry.amount)}
        </span>
      </td>
    </tr>
  )
}

// ── Entry Form ────────────────────────────────

const inputCls = "w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"

function EntryForm({ projects, onSave, onCancel }: {
  projects: { id: string; name: string }[]
  onSave: (entry: Omit<FinancialEntry, "id" | "status" | "paidAt">) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<FinancialType>("receber")
  const [description, setDescription] = useState("")
  const [clientOrSupplier, setClientOrSupplier] = useState("")
  const [projectId, setProjectId] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [category, setCategory] = useState("Honorários")
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!description.trim()) e.description = "Obrigatório"
    if (!clientOrSupplier.trim()) e.clientOrSupplier = "Obrigatório"
    if (!amount || parseFloat(amount) <= 0) e.amount = "Valor inválido"
    if (!dueDate) e.dueDate = "Obrigatório"
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onSave({
      type,
      description,
      clientOrSupplier,
      projectId: projectId || undefined,
      amount: parseFloat(amount),
      dueDate,
      category,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Novo lançamento</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Type toggle */}
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg border border-border">
            <button type="button" onClick={() => setType("receber")}
              className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", type === "receber" ? "bg-emerald-500/10 text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              A receber
            </button>
            <button type="button" onClick={() => setType("pagar")}
              className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", type === "pagar" ? "bg-rose-500/10 text-rose-400 shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              A pagar
            </button>
          </div>

          <FormField label="Descrição" error={errors.description}>
            <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: 2ª parcela do projeto X" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={type === "receber" ? "Cliente" : "Fornecedor"} error={errors.clientOrSupplier}>
              <input className={inputCls} value={clientOrSupplier} onChange={e => setClientOrSupplier(e.target.value)} placeholder="Nome" />
            </FormField>
            <FormField label="Projeto (opcional)">
              <select className={inputCls} value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Nenhum</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name.split("—")[0].trim()}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Valor (R$)" error={errors.amount}>
              <input className={inputCls} type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
            </FormField>
            <FormField label="Vencimento" error={errors.dueDate}>
              <input className={inputCls} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Categoria">
            <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
              {["Honorários", "Mão de obra", "Fornecedor", "Imposto", "Outros"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>

          <div className="pt-2 flex justify-end gap-2 border-t border-border">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormField({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

// ── Page ─────────────────────────────────────

export default function FinancialPage() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const kpis = useFinancialKPIs(state)
  const search = useSearch()

  const [tab, setTab] = useState<"geral" | "receber" | "pagar">("geral")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FinancialStatus | "">("")

  useEffect(() => {
    const params = new URLSearchParams(search)
    const id = params.get("id")
    if (id) setSelectedId(id)
    if (params.get("new") === "1") setIsCreating(true)
  }, [search])

  const selectedEntry = selectedId ? state.financialEntries.find(f => f.id === selectedId) : null
  const selectedProjectName = selectedEntry?.projectId
    ? state.projects.find(p => p.id === selectedEntry.projectId)?.name.split("—")[0].trim()
    : undefined

  function getProjectName(projectId?: string) {
    return projectId ? state.projects.find(p => p.id === projectId)?.name.split("—")[0].trim() : undefined
  }

  const receivables = state.financialEntries.filter(f => f.type === "receber")
  const payables = state.financialEntries.filter(f => f.type === "pagar")

  const filteredReceivables = filterStatus ? receivables.filter(f => f.status === filterStatus) : receivables
  const filteredPayables = filterStatus ? payables.filter(f => f.status === filterStatus) : payables

  // Chart data: cost tracking per project
  const chartData = state.projects.map(p => ({
    name: p.name.split("—")[0].trim().split(" ").slice(0, 2).join(" "),
    "Custo previsto": p.plannedCost,
    "Custo realizado": p.realizedCost,
  }))

  function handleMarkPaid() {
    if (!selectedEntry) return
    dispatch({
      type: "UPDATE_FINANCIAL",
      payload: {
        id: selectedEntry.id,
        updates: {
          status: selectedEntry.type === "receber" ? "recebido" : "pago",
          paidAt: new Date().toISOString().split("T")[0],
        },
      },
    })
    setSelectedId(null)
  }

  function handleCreate(data: Omit<FinancialEntry, "id" | "status" | "paidAt">) {
    const newId = `F-${state.financialEntries.length + 100}`
    dispatch({
      type: "CREATE_FINANCIAL",
      payload: { ...data, id: newId, status: "pendente" },
    })
    setIsCreating(false)
  }

  const TABS = [
    { key: "geral", label: "Geral" },
    { key: "receber", label: "A receber" },
    { key: "pagar", label: "A pagar" },
  ] as const

  return (
    <div className="h-full flex flex-col bg-background pb-16 md:pb-0">
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visão gerencial do mês</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Lançamento
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiCard label="Receita prevista" value={formatCurrency(kpis.receitaPrevista)} variant="positive" />
          <KpiCard label="Receita recebida" value={formatCurrency(kpis.receitaRecebida)} />
          <KpiCard label="Despesas previstas" value={formatCurrency(kpis.despesasPrevistas)} variant="negative" />
          <KpiCard label="Despesas pagas" value={formatCurrency(kpis.despesasPagas)} />
          <KpiCard
            label="Resultado previsto"
            value={formatCurrency(kpis.resultado)}
            variant={kpis.resultado >= 0 ? "positive" : "negative"}
          />
          <KpiCard
            label="Margem prevista"
            value={`${kpis.margem.toFixed(1)}%`}
            variant={kpis.margem > 20 ? "positive" : "warning"}
          />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="px-6 md:px-8 border-b border-border shrink-0 flex items-center justify-between">
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setFilterStatus("") }}
              className={cn(
                "px-4 py-3 text-sm transition-colors",
                tab === t.key
                  ? "text-foreground border-b-2 border-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(tab === "receber" || tab === "pagar") && (
          <div className="flex items-center gap-2">
            <select
              className="text-xs bg-secondary/50 border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as FinancialStatus | "")}
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="vencido">Vencido</option>
              <option value={tab === "receber" ? "recebido" : "pago"}>{tab === "receber" ? "Recebido" : "Pago"}</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === "geral" && (
          <div className="px-6 md:px-8 py-6 space-y-6">
            {/* Cost tracking chart */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Custo previsto vs realizado por projeto</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                    <Bar dataKey="Custo previsto" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} maxBarSize={36} opacity={0.5} />
                    <Bar dataKey="Custo realizado" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Distribuição por projeto</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Projeto</th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Orçamento</th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Custo prev.</th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Custo real.</th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {state.projects.map(p => {
                    const margin = p.budget > 0 ? ((p.budget - p.realizedCost) / p.budget * 100) : 0
                    return (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="px-5 py-3">
                          <p className="text-foreground font-medium text-xs">{p.id}</p>
                          <p className="text-muted-foreground text-[11px]">{p.name.split("—")[0].trim()}</p>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">{formatCurrency(p.budget)}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">{formatCurrency(p.plannedCost)}</td>
                        <td className={cn("px-5 py-3 text-right font-mono text-xs", p.realizedCost > p.plannedCost ? "text-amber-400" : "text-foreground")}>
                          {formatCurrency(p.realizedCost)}
                        </td>
                        <td className={cn("px-5 py-3 text-right font-mono text-xs", margin > 20 ? "text-emerald-400" : "text-amber-400")}>
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(tab === "receber" || tab === "pagar") && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Descrição</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {tab === "receber" ? "Cliente" : "Fornecedor"}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Projeto</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Vencimento</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(tab === "receber" ? filteredReceivables : filteredPayables).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                ) : (
                  (tab === "receber" ? filteredReceivables : filteredPayables).map(f => (
                    <EntryRow
                      key={f.id}
                      entry={f}
                      projectName={getProjectName(f.projectId)}
                      onSelect={() => setSelectedId(f.id)}
                    />
                  ))
                )}
              </tbody>
              {tab === "receber" && filteredReceivables.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-secondary/20">
                    <td colSpan={5} className="px-4 py-3 text-xs font-medium text-muted-foreground">Total</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-sm text-emerald-400">
                      {formatCurrency(filteredReceivables.reduce((s, f) => s + f.amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
              {tab === "pagar" && filteredPayables.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-secondary/20">
                    <td colSpan={5} className="px-4 py-3 text-xs font-medium text-muted-foreground">Total</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-sm text-rose-400">
                      {formatCurrency(filteredPayables.reduce((s, f) => s + f.amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedEntry && (
        <EntryDrawer
          entry={selectedEntry}
          projectName={selectedProjectName}
          onClose={() => setSelectedId(null)}
          onMarkPaid={handleMarkPaid}
        />
      )}

      {/* Create form */}
      {isCreating && (
        <EntryForm
          projects={state.projects.map(p => ({ id: p.id, name: p.name }))}
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  )
}
