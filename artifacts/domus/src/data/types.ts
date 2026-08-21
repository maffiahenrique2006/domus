// ──────────────────────────────────────────────
// Core domain types for the Vértice Espaços demo
// ──────────────────────────────────────────────

export type DemandStatus =
  | "nova"
  | "em_analise"
  | "aguardando_cliente"
  | "aprovada"
  | "convertida"
  | "cancelada"

export type DemandPriority = "urgente" | "alta" | "media" | "baixa"

export type ProjectPhaseId =
  | "planejamento"
  | "conceito"
  | "projeto_executivo"
  | "aprovacao"
  | "compras"
  | "obra"
  | "entrega"

export type ProjectHealth = "saudavel" | "atencao"

export type FinancialStatus = "pendente" | "vencido" | "pago" | "recebido"
export type FinancialType = "receber" | "pagar"

// ── Shared sub-types ─────────────────────────

export interface Comment {
  id: string
  author: string
  authorInitials: string
  text: string
  createdAt: string
}

export interface HistoryEntry {
  id: string
  action: string
  author: string
  createdAt: string
}

export interface FileChip {
  id: string
  name: string
  ext: string
  size: string
}

// ── Demand ────────────────────────────────────

export interface Demand {
  id: string           // "D-1042"
  title: string
  client: string
  priority: DemandPriority
  responsible: string | null
  status: DemandStatus
  dueDate: string      // YYYY-MM-DD
  estimatedValue: number
  description: string
  origin: string
  projectId?: string   // set when converted
  comments: Comment[]
  history: HistoryEntry[]
  files: FileChip[]
  createdAt: string
}

// ── Project ───────────────────────────────────

export interface ProjectTask {
  id: string
  title: string
  responsible: string
  done: boolean
  dueDate?: string
}

export interface ProjectPhaseEntry {
  id: ProjectPhaseId
  label: string
  startDate: string
  endDate: string
}

export interface Project {
  id: string           // "P-238"
  name: string
  client: string
  responsible: string
  phase: ProjectPhaseId
  progress: number     // 0–100
  dueDate: string
  budget: number       // orçamento total (receita)
  plannedCost: number  // custo previsto
  realizedCost: number // custo realizado
  health: ProjectHealth
  healthNote?: string
  demandId?: string    // origin demand
  tasks: ProjectTask[]
  phases: ProjectPhaseEntry[]
  history: HistoryEntry[]
}

// ── Financial ─────────────────────────────────

export interface FinancialEntry {
  id: string
  type: FinancialType
  description: string
  clientOrSupplier: string
  projectId?: string
  amount: number
  dueDate: string
  status: FinancialStatus
  paidAt?: string
  category: string
}

// ── Team ──────────────────────────────────────

export interface TeamMember {
  id: string
  name: string
  role: string
  initials: string
}

// ── App state ─────────────────────────────────

export interface AppState {
  demands: Demand[]
  projects: Project[]
  financialEntries: FinancialEntry[]
}
