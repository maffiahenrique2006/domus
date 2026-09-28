import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { Link } from "wouter";
import { Plus, X, CheckCircle2, ArrowRight } from "lucide-react";
import { useWorkspace, useFinancialKPIs } from "@/data/store";
import type { Demand, FinancialEntry, Client } from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50";
export const secondary =
  "rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50";
export const panel = "rounded-xl border border-border bg-card p-5";
const priorities: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};
const statuses: Record<string, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  aguardando_cliente: "Aguardando cliente",
  aprovada: "Aprovada",
  convertida: "Convertida em caso",
  cancelada: "Cancelada",
};
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
export function Page({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 pb-24">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current
      ?.querySelector<HTMLElement>("input,button,select,textarea")
      ?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...(ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        ) || []),
      ];
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-4xl" : "max-w-xl"} max-h-[90vh] overflow-auto bg-card rounded-xl border border-border p-6`}
      >
        <header className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Fechar" onClick={close}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function ErrorLine({ error }: { error: string }) {
  return error ? (
    <p
      role="alert"
      className="rounded-md bg-destructive/10 border border-destructive/30 text-red-400 p-3 text-sm mb-4"
    >
      {error}
    </p>
  ) : null;
}
export function CustomFields({
  entity,
  values,
  change,
}: {
  entity: "demand" | "project";
  values: Record<string, string | number>;
  change: (v: Record<string, string | number>) => void;
}) {
  const { state } = useWorkspace();
  return (
    <>
      {state.configuration?.fields
        .filter((f) => f.entity === entity)
        .map((f) => (
          <Field key={f.id} label={`${f.label}${f.required ? " *" : ""}`}>
            {f.type === "select" ? (
              <select
                className={inputClass}
                required={f.required}
                value={values[f.id] ?? ""}
                onChange={(e) => change({ ...values, [f.id]: e.target.value })}
              >
                <option value="">Selecione</option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass}
                required={f.required}
                type={f.type}
                value={values[f.id] ?? ""}
                onChange={(e) => {
                  const next = { ...values };
                  if (e.target.value === "") delete next[f.id];
                  else
                    next[f.id] =
                      f.type === "number"
                        ? Number(e.target.value)
                        : e.target.value;
                  change(next);
                }}
              />
            )}
          </Field>
        ))}
    </>
  );
}
export function Overview() {
  const { state } = useWorkspace();
  const k = useFinancialKPIs(state);
  const cards = [
    [
      "Demandas abertas",
      state.demands.filter(
        (d) => !["cancelada", "convertida"].includes(d.status),
      ).length,
    ],
    ["Casos", state.projects.length],
    ["Recebido", formatCurrency(k.receitaRecebida)],
    ["Saldo realizado", formatCurrency(k.receitaRecebida - k.despesasPagas)],
  ];
  return (
    <Page
      title={state.company.name}
      subtitle="Seu escritório, organizado do primeiro atendimento ao recebimento."
      action={
        <Link className={secondary} href="/configuracao">
          Configuração do escritório
        </Link>
      }
    >
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cards.map(([label, value]) => (
          <div key={label} className={panel}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold mt-3">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className={panel}>
          <h2 className="font-medium mb-4">Próximas ações</h2>
          <div className="space-y-3">
            {[
              ["Cadastrar clientes", "/clientes"],
              ["Organizar demandas", "/demandas"],
              ["Acompanhar casos e tarefas", "/projetos"],
              ["Consultar sua operação com IA", "/domus-ai"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="flex justify-between items-center border-b border-border py-3 text-sm"
              >
                {label}
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
        <section className={panel}>
          <h2 className="font-medium mb-4">Atenção aos prazos</h2>
          {state.projects
            .flatMap((p) =>
              p.tasks
                .filter((t) => !t.done && t.dueDate)
                .map((t) => ({ ...t, name: p.name })),
            )
            .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
            .slice(0, 6)
            .map((t) => (
              <div key={t.id} className="py-3 border-b border-border">
                <p className="text-sm">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.name} · {formatDate(t.dueDate!)}
                </p>
              </div>
            ))}
          {!state.projects.some((p) =>
            p.tasks.some((t) => !t.done && t.dueDate),
          ) && (
            <p className="text-sm text-muted-foreground">
              Nenhuma tarefa com prazo pendente. Adicione tarefas aos seus
              casos.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-5">
            Os prazos são informados pelo escritório. A Domus não calcula prazos
            processuais automaticamente.
          </p>
        </section>
      </div>
    </Page>
  );
}
export function Clients() {
  const { state, dispatch, busy } = useWorkspace();
  const [edit, setEdit] = useState<Partial<Client> | null>(null);
  const [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    try {
      await dispatch({
        type: edit.id ? "UPDATE_CLIENT" : "CREATE_CLIENT",
        payload: edit.id
          ? { id: edit.id, updates: edit }
          : { ...edit, id: crypto.randomUUID() },
      });
      setEdit(null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page
      title="Clientes"
      subtitle="Pessoas e empresas atendidas pelo seu escritório."
      action={
        <button
          className={buttonClass}
          onClick={() => setEdit({ name: "", email: "", phone: "" })}
        >
          <Plus size={16} />
          Novo cliente
        </button>
      }
    >
      <ErrorLine error={error} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.clients.map((c) => (
          <button
            key={c.id}
            className={`${panel} text-left`}
            onClick={() => setEdit(c)}
          >
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {c.email || "Sem e-mail"}
            </p>
            <p className="text-sm text-muted-foreground">{c.phone}</p>
          </button>
        ))}
      </div>
      {!state.clients.length && (
        <Empty>
          Cadastre seu primeiro cliente para vincular demandas e casos.
        </Empty>
      )}
      {edit && (
        <Modal
          title={edit.id ? "Editar cliente" : "Novo cliente"}
          close={() => setEdit(null)}
        >
          <form onSubmit={save} className="space-y-4">
            <ErrorLine error={error} />
            <Field label="Nome *">
              <input
                required
                className={inputClass}
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                className={inputClass}
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />
            </Field>
            <Field label="Telefone">
              <input
                className={inputClass}
                value={edit.phone}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
              />
            </Field>
            <button disabled={busy} className={buttonClass}>
              Salvar cliente
            </button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
export function Demands() {
  const { state, dispatch, busy } = useWorkspace();
  const [edit, setEdit] = useState<Demand | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [converting, setConverting] = useState<Demand | null>(null);
  const [caseValues, setCaseValues] = useState<Record<string, string | number>>(
    {},
  );
  const blank = (): Demand => ({
    id: crypto.randomUUID(),
    title: "",
    client: "",
    clientId: "",
    responsible: null,
    priority: "media",
    status: "nova",
    dueDate: "",
    estimatedValue: 0,
    description: "",
    origin: "",
    createdAt: new Date().toISOString(),
    comments: [],
    history: [],
    files: [],
    customValues: {},
  });
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    try {
      const { projectId, ...updates } = edit;
      if (updates.status === "convertida")
        delete (updates as Partial<Demand>).status;
      await dispatch({
        type: state.demands.some((d) => d.id === edit.id)
          ? "UPDATE_DEMAND"
          : "CREATE_DEMAND",
        payload: state.demands.some((d) => d.id === edit.id)
          ? { id: edit.id, updates }
          : edit,
      });
      setEdit(null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function convert(d: Demand) {
    try {
      // Criar o caso é a aprovação: demanda ainda não aprovada é aprovada antes de converter.
      if (d.status !== "aprovada")
        await dispatch({
          type: "UPDATE_DEMAND",
          payload: { id: d.id, updates: { status: "aprovada" } },
        });
      await dispatch({
        type: "CONVERT_DEMAND",
        payload: { demandId: d.id, customValues: caseValues },
      });
      setConverting(null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page
      title="Demandas"
      subtitle="Do primeiro contato à contratação. Uma demanda aprovada vira caso."
      action={
        <button
          disabled={!state.clients.length}
          className={buttonClass}
          onClick={() => setEdit(blank())}
        >
          <Plus size={16} />
          Nova demanda
        </button>
      }
    >
      <ErrorLine error={error} />
      {!state.clients.length && (
        <p className="mb-5 text-sm">
          Primeiro,{" "}
          <Link className="text-primary underline" href="/clientes">
            cadastre um cliente
          </Link>
          .
        </p>
      )}
      <input
        aria-label="Buscar demandas"
        className={`${inputClass} max-w-sm mb-5`}
        placeholder="Buscar por título ou cliente"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="space-y-3">
        {state.demands
          .filter((d) =>
            `${d.title} ${d.client}`
              .toLowerCase()
              .includes(filter.toLowerCase()),
          )
          .map((d) => (
            <section className={panel} key={d.id}>
              <div className="flex justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-primary mb-2">
                    {statuses[d.status]} · {priorities[d.priority] ?? d.priority}
                  </p>
                  <h2 className="font-semibold">{d.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {d.client} · {d.responsible || "Responsável pendente"}
                  </p>
                  <p className="text-sm mt-2">
                    {formatCurrency(d.estimatedValue)}
                    {d.dueDate && ` · ${formatDate(d.dueDate)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={secondary}
                    onClick={() => setEdit({ ...d })}
                  >
                    Editar
                  </button>
                  {!d.projectId &&
                    !["convertida", "cancelada"].includes(d.status) && (
                      <button
                        disabled={busy}
                        className={buttonClass}
                        onClick={() => {
                          setConverting(d);
                          setCaseValues({});
                        }}
                      >
                        {d.status === "aprovada"
                          ? "Criar caso"
                          : "Aprovar e criar caso"}
                      </button>
                    )}
                  {d.projectId && (
                    <Link className={secondary} href="/projetos">
                      Ver casos
                    </Link>
                  )}
                </div>
              </div>
            </section>
          ))}
      </div>
      {!state.demands.length && (
        <Empty>
          Suas demandas aparecerão aqui. Comece registrando um atendimento.
        </Empty>
      )}
      {converting && (
        <Modal title="Criar caso" close={() => setConverting(null)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void convert(converting);
            }}
          >
            <ErrorLine error={error} />
            <p className="text-sm text-muted-foreground">
              O caso “{converting.title}” usará o cliente, responsável, prazo e
              honorários da demanda.
              {state.configuration?.fields.some((f) => f.entity === "project")
                ? " Preencha as informações específicas abaixo."
                : " Nenhuma informação adicional é exigida pela sua configuração."}
            </p>
            <CustomFields
              entity="project"
              values={caseValues}
              change={setCaseValues}
            />
            <button className={buttonClass} disabled={busy}>
              Confirmar e criar caso
            </button>
          </form>
        </Modal>
      )}
      {edit && (
        <Modal title="Demanda" close={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-4">
            <ErrorLine error={error} />
            <Field label="Título *">
              <input
                required
                className={inputClass}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                placeholder="Ex.: revisão de contrato comercial"
              />
            </Field>
            <Field label="Cliente *">
              <select
                required
                className={inputClass}
                value={edit.clientId || ""}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    clientId: e.target.value,
                    client:
                      state.clients.find((c) => c.id === e.target.value)
                        ?.name || "",
                  })
                }
              >
                <option value="">Selecione</option>
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Serviço">
              <select
                className={inputClass}
                value={edit.service || ""}
                onChange={(e) => setEdit({ ...edit, service: e.target.value })}
              >
                <option value="">Selecione</option>
                {state.configuration?.services.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Responsável">
              <input
                className={inputClass}
                value={edit.responsible || ""}
                onChange={(e) =>
                  setEdit({ ...edit, responsible: e.target.value || null })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Situação">
                <select
                  className={inputClass}
                  value={edit.status}
                  disabled={edit.status === "convertida"}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      status: e.target.value as Demand["status"],
                    })
                  }
                >
                  {Object.entries(statuses)
                    .filter(
                      ([k]) =>
                        k !== "convertida" || edit.status === "convertida",
                    )
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Prioridade">
                <select
                  className={inputClass}
                  value={edit.priority}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      priority: e.target.value as Demand["priority"],
                    })
                  }
                >
                  {["baixa", "media", "alta", "urgente"].map((p) => (
                    <option key={p} value={p}>
                      {priorities[p]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Prazo informado pelo escritório">
              <input
                type="date"
                className={inputClass}
                value={edit.dueDate}
                onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })}
              />
            </Field>
            <Field label="Honorários estimados (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={edit.estimatedValue}
                onChange={(e) =>
                  setEdit({ ...edit, estimatedValue: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Descrição">
              <textarea
                className={inputClass}
                value={edit.description}
                onChange={(e) =>
                  setEdit({ ...edit, description: e.target.value })
                }
              />
            </Field>
            <CustomFields
              entity="demand"
              values={edit.customValues || {}}
              change={(customValues) => setEdit({ ...edit, customValues })}
            />
            <button disabled={busy} className={buttonClass}>
              Salvar demanda
            </button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
export function Finance() {
  const { state, dispatch, busy } = useWorkspace();
  const [edit, setEdit] = useState<FinancialEntry | null>(null);
  const [error, setError] = useState("");
  const k = useFinancialKPIs(state);
  const blank = (): FinancialEntry => ({
    id: crypto.randomUUID(),
    type: "receber",
    description: "",
    clientOrSupplier: "",
    amount: 0,
    dueDate: "",
    status: "pendente",
    category: "Honorários",
  });
  return (
    <Page
      title="Financeiro"
      subtitle="Honorários, despesas e recebimentos. Registro manual, sem movimentação bancária."
      action={
        <button className={buttonClass} onClick={() => setEdit(blank())}>
          <Plus size={16} />
          Novo lançamento
        </button>
      }
    >
      <ErrorLine error={error} />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          ["A receber", k.receitaPrevista - k.receitaRecebida],
          ["A pagar", k.despesasPrevistas - k.despesasPagas],
          ["Recebido", k.receitaRecebida],
          ["Saldo realizado", k.receitaRecebida - k.despesasPagas],
        ].map(([l, v]) => (
          <div className={panel} key={l}>
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="text-2xl font-semibold mt-2">
              {formatCurrency(Number(v))}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {state.financialEntries.map((f) => (
          <section className={panel} key={f.id}>
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">
                  {f.type === "receber" ? "Receita" : "Despesa"} · {f.status}
                </p>
                <h2 className="font-medium mt-1">{f.description}</h2>
                <p className="text-sm text-muted-foreground">
                  {f.clientOrSupplier} · {formatDate(f.dueDate)}
                </p>
                {f.projectId && (
                  <p className="text-xs text-primary mt-1">
                    {state.projects.find((p) => p.id === f.projectId)?.name}
                  </p>
                )}
              </div>
              <div className="flex gap-3 items-center">
                <strong>{formatCurrency(f.amount)}</strong>
                <button className={secondary} onClick={() => setEdit({ ...f })}>
                  Editar
                </button>
                {!["pago", "recebido"].includes(f.status) && (
                  <button
                    disabled={busy}
                    className={buttonClass}
                    onClick={async () => {
                      try {
                        await dispatch({
                          type: "UPDATE_FINANCIAL",
                          payload: {
                            id: f.id,
                            updates: {
                              status:
                                f.type === "receber" ? "recebido" : "pago",
                              paidAt: new Date().toISOString().slice(0, 10),
                            },
                          },
                        });
                        setError("");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {f.type === "receber" ? "Receber" : "Pagar"}
                  </button>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
      {!state.financialEntries.length && (
        <Empty>Registre o primeiro honorário ou despesa do escritório.</Empty>
      )}
      {edit && (
        <Modal title="Lançamento financeiro" close={() => setEdit(null)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const existing = state.financialEntries.some(
                  (f) => f.id === edit.id,
                );
                await dispatch({
                  type: existing ? "UPDATE_FINANCIAL" : "CREATE_FINANCIAL",
                  payload: existing ? { id: edit.id, updates: edit } : edit,
                });
                setEdit(null);
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <ErrorLine error={error} />
            <Field label="Descrição *">
              <input
                required
                className={inputClass}
                value={edit.description}
                onChange={(e) =>
                  setEdit({ ...edit, description: e.target.value })
                }
              />
            </Field>
            <Field label="Tipo">
              <select
                disabled={["pago", "recebido"].includes(edit.status)}
                className={inputClass}
                value={edit.type}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    type: e.target.value as FinancialEntry["type"],
                  })
                }
              >
                <option value="receber">A receber</option>
                <option value="pagar">A pagar</option>
              </select>
            </Field>
            <Field label="Cliente ou fornecedor *">
              <input
                required
                className={inputClass}
                value={edit.clientOrSupplier}
                onChange={(e) =>
                  setEdit({ ...edit, clientOrSupplier: e.target.value })
                }
              />
            </Field>
            <Field label="Caso relacionado">
              <select
                className={inputClass}
                value={edit.projectId || ""}
                onChange={(e) =>
                  setEdit({ ...edit, projectId: e.target.value || undefined })
                }
              >
                <option value="">Despesa ou receita geral</option>
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Valor (R$) *">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className={inputClass}
                value={edit.amount}
                onChange={(e) =>
                  setEdit({ ...edit, amount: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Vencimento *">
              <input
                required
                type="date"
                className={inputClass}
                value={edit.dueDate}
                onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })}
              />
            </Field>
            <Field label="Categoria">
              <input
                className={inputClass}
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              />
            </Field>
            <button disabled={busy} className={buttonClass}>
              Salvar lançamento
            </button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
