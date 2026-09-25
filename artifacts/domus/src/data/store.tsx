import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Workspace, AppState } from "./types";

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.error ||
        data.message ||
        `Não foi possível concluir (${response.status}).`,
    );
  return data;
}
type Action = { type: string; payload: any };
const Context = createContext<{
  state: Workspace;
  dispatch: (action: Action) => Promise<void>;
  refresh: () => Promise<void>;
  replace: (state: Workspace) => void;
  busy: boolean;
} | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  async function refresh() {
    setError("");
    try {
      setState(await api<Workspace>("/api/workspace"));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function dispatch(action: Action) {
    if (locked.current || !state) throw new Error("Aguarde a operação atual.");
    locked.current = true;
    setBusy(true);
    try {
      setState(
        await api<Workspace>("/api/workspace/actions", {
          ...action,
          revision: state.revision,
        }),
      );
    } catch (e) {
      await refresh();
      throw e;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (!state)
    return (
      <div className="dark min-h-screen bg-background text-foreground grid place-items-center p-6">
        <div role="status">
          {error || "Carregando seu escritório…"}
          {error && (
            <button
              className="block mt-4 underline"
              onClick={() => void refresh()}
            >
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    );
  return (
    <Context.Provider
      value={{ state, dispatch, refresh, replace: setState, busy }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace indisponível");
  return value;
}
export function useAppState() {
  return useWorkspace().state;
}
export function useAppDispatch() {
  return useWorkspace().dispatch;
}
export function useOpenDemandsCount(state: AppState) {
  return state.demands.filter(
    (d) => !["convertida", "cancelada"].includes(d.status),
  ).length;
}
export function useFinancialKPIs(state: AppState) {
  const sum = (type: string, status?: string) =>
    state.financialEntries
      .filter((f) => f.type === type && (!status || f.status === status))
      .reduce((s, f) => s + f.amount, 0);
  const receitaPrevista = sum("receber"),
    receitaRecebida = sum("receber", "recebido"),
    despesasPrevistas = sum("pagar"),
    despesasPagas = sum("pagar", "pago");
  return {
    receitaPrevista,
    receitaRecebida,
    despesasPrevistas,
    despesasPagas,
    resultado: receitaPrevista - despesasPrevistas,
    margem: receitaPrevista
      ? ((receitaPrevista - despesasPrevistas) / receitaPrevista) * 100
      : 0,
    vencendoEmBreve: state.financialEntries.filter(
      (f) =>
        f.type === "pagar" &&
        f.status !== "pago" &&
        f.dueDate <=
          new Date(Date.now() + 864000000).toISOString().slice(0, 10),
    ),
  };
}
