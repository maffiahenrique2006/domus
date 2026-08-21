import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react"
import type { AppState, Demand, Project, FinancialEntry } from "./types"
import { SEED_STATE } from "./seed"

// ── Actions ───────────────────────────────────

type Action =
  | { type: "HYDRATE"; payload: AppState }
  | { type: "UPDATE_DEMAND"; payload: { id: string; updates: Partial<Demand> } }
  | { type: "CREATE_DEMAND"; payload: Demand }
  | {
      type: "CONVERT_DEMAND"
      payload: { demandId: string; project: Project }
    }
  | { type: "UPDATE_PROJECT"; payload: { id: string; updates: Partial<Project> } }
  | { type: "CREATE_PROJECT"; payload: Project }
  | {
      type: "TOGGLE_PROJECT_TASK"
      payload: { projectId: string; taskId: string }
    }
  | { type: "UPDATE_FINANCIAL"; payload: { id: string; updates: Partial<FinancialEntry> } }
  | { type: "CREATE_FINANCIAL"; payload: FinancialEntry }

// ── Reducer ───────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload

    case "UPDATE_DEMAND":
      return {
        ...state,
        demands: state.demands.map((d) =>
          d.id === action.payload.id ? { ...d, ...action.payload.updates } : d
        ),
      }

    case "CREATE_DEMAND":
      return { ...state, demands: [action.payload, ...state.demands] }

    case "CONVERT_DEMAND": {
      const { demandId, project } = action.payload
      return {
        ...state,
        demands: state.demands.map((d) =>
          d.id === demandId
            ? { ...d, status: "convertida", projectId: project.id }
            : d
        ),
        projects: [project, ...state.projects],
      }
    }

    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      }

    case "CREATE_PROJECT":
      return { ...state, projects: [action.payload, ...state.projects] }

    case "TOGGLE_PROJECT_TASK":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? {
                ...p,
                tasks: p.tasks.map((t) =>
                  t.id === action.payload.taskId ? { ...t, done: !t.done } : t
                ),
              }
            : p
        ),
      }

    case "UPDATE_FINANCIAL":
      return {
        ...state,
        financialEntries: state.financialEntries.map((f) =>
          f.id === action.payload.id ? { ...f, ...action.payload.updates } : f
        ),
      }

    case "CREATE_FINANCIAL":
      return {
        ...state,
        financialEntries: [action.payload, ...state.financialEntries],
      }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────

const STORAGE_KEY = "vertice-app-state-v1"

const StateContext = createContext<AppState | null>(null)
const DispatchContext = createContext<React.Dispatch<Action> | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, SEED_STATE, () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AppState
        // Basic validation: must have all three arrays
        if (
          Array.isArray(parsed.demands) &&
          Array.isArray(parsed.projects) &&
          Array.isArray(parsed.financialEntries)
        ) {
          return parsed
        }
      }
    } catch {
      // ignore parse errors, fall through to seed
    }
    return SEED_STATE
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore quota errors
    }
  }, [state])

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────

export function useAppState(): AppState {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error("useAppState must be used inside AppProvider")
  return ctx
}

export function useAppDispatch(): React.Dispatch<Action> {
  const ctx = useContext(DispatchContext)
  if (!ctx) throw new Error("useAppDispatch must be used inside AppProvider")
  return ctx
}

// ── Selectors / helpers ───────────────────────

export function useOpenDemandsCount(state: AppState): number {
  return state.demands.filter((d) => d.status !== "cancelada").length
}

export function useFinancialKPIs(state: AppState) {
  const receber = state.financialEntries.filter((f) => f.type === "receber")
  const pagar = state.financialEntries.filter((f) => f.type === "pagar")

  const receitaPrevista = receber.reduce((s, f) => s + f.amount, 0)
  const receitaRecebida = receber
    .filter((f) => f.status === "recebido")
    .reduce((s, f) => s + f.amount, 0)
  const despesasPrevistas = pagar.reduce((s, f) => s + f.amount, 0)
  const despesasPagas = pagar
    .filter((f) => f.status === "pago")
    .reduce((s, f) => s + f.amount, 0)

  const resultado = receitaPrevista - despesasPrevistas
  const margem =
    receitaPrevista > 0 ? (resultado / receitaPrevista) * 100 : 0

  const hoje = new Date()
  const em10dias = new Date(hoje.getTime() + 10 * 86400000)
  const vencendoEmBreve = pagar.filter((f) => {
    if (f.status === "pago") return false
    const d = new Date(f.dueDate)
    return d <= em10dias && d >= hoje
  })

  return {
    receitaPrevista,
    receitaRecebida,
    despesasPrevistas,
    despesasPagas,
    resultado,
    margem,
    vencendoEmBreve,
  }
}
