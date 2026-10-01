// Casos e serviços: quadro por etapa, busca e filtro, e o caso aberto com
// tarefas, financeiro e dados editáveis no mesmo lugar.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  LayoutGrid,
  List,
  Trash2,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { useWorkspace } from "@/data/store";
import { track } from "@/lib/analytics";
import type {
  Project,
  ProjectTask,
  FinancialEntry,
  Demand,
} from "@/data/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  Page,
  Field,
  Modal,
  Empty,
  ErrorLine,
  CustomFields,
  inputClass,
  buttonClass,
  secondary,
} from "@/pages/legal-workspace";

type Stage = { id: string; label: string };
type View = "quadro" | "lista";
type Tab = "tarefas" | "financeiro" | "dados";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Não foi possível concluir.";
const today = () => new Date().toISOString().slice(0, 10);

function Progress({ project }: { project: Project }) {
  const done = project.tasks.filter((t) => t.done).length;
  const total = project.tasks.length;
  return (
    <div>
      <div
        className="h-1.5 rounded-full bg-secondary overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Tarefas concluídas"
      >
        <div
          className="h-full bg-primary"
          style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        {total ? `${done} de ${total} tarefas` : "Sem tarefas"}
      </p>
    </div>
  );
}

// ── Cartão do quadro ──────────────────────────

function CaseCard({
  project,
  stages,
  busy,
  onOpen,
  onMove,
  onDragStart,
}: {
  project: Project;
  stages: Stage[];
  busy: boolean;
  onOpen: () => void;
  onMove: (stageId: string) => void;
  onDragStart: () => void;
}) {
  const index = stages.findIndex((s) => s.id === project.phase);
  const previous = stages[index - 1];
  const next = stages[index + 1];
  return (
    <article
      draggable={!busy}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", project.id);
        onDragStart();
      }}
      className="rounded-lg border border-border bg-card p-3 space-y-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors"
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left space-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm leading-snug">
            {project.name}
          </span>
          {project.health === "atencao" && (
            <AlertTriangle
              size={15}
              className="text-amber-400 shrink-0 mt-0.5"
              aria-label="Tarefa com prazo vencido"
            />
          )}
        </span>
        <span className="block text-xs text-muted-foreground">
          {project.client}
        </span>
        <span className="block text-xs text-muted-foreground">
          {project.responsible || "Sem responsável"}
          {project.dueDate && ` · ${formatDate(project.dueDate)}`}
        </span>
      </button>
      <Progress project={project} />
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={busy || !previous}
          onClick={() => previous && onMove(previous.id)}
          aria-label={
            previous ? `Voltar para ${previous.label}` : "Primeira etapa"
          }
          title={previous ? `Voltar para ${previous.label}` : undefined}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="text-xs text-primary hover:underline"
        >
          Abrir caso
        </button>
        <button
          type="button"
          disabled={busy || !next}
          onClick={() => next && onMove(next.id)}
          aria-label={next ? `Avançar para ${next.label}` : "Última etapa"}
          title={next ? `Avançar para ${next.label}` : undefined}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}

// ── Tarefas do caso ───────────────────────────

const blankTask = (): ProjectTask => ({
  id: "",
  title: "",
  description: "",
  responsible: "",
  dueDate: "",
  done: false,
});

function Tasks({ project }: { project: Project }) {
  const { dispatch, busy } = useWorkspace();
  const [task, setTask] = useState<ProjectTask | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function saveTasks(tasks: ProjectTask[]) {
    try {
      await dispatch({
        type: "UPDATE_PROJECT",
        payload: { id: project.id, updates: { tasks } },
      });
      setError("");
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!task) return;
    const clean = { ...task, dueDate: task.dueDate || "" };
    const ok = await saveTasks(
      task.id
        ? project.tasks.map((t) => (t.id === task.id ? clean : t))
        : [...project.tasks, { ...clean, id: crypto.randomUUID() }],
    );
    if (ok) setTask(null);
  }

  // Pendentes primeiro; dentro de cada grupo, prazo mais próximo primeiro e sem prazo por último.
  const ordered = [...project.tasks].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
      a.title.localeCompare(b.title),
  );

  return (
    <div className="space-y-4">
      <ErrorLine error={error} />
      <Progress project={project} />
      {!project.tasks.length && !task && (
        <p className="text-sm text-muted-foreground">
          Este caso ainda não tem tarefas.
        </p>
      )}
      <ul className="divide-y divide-border">
        {ordered.map((t) => (
          <li key={t.id} className="flex gap-3 py-3 items-start">
            <input
              type="checkbox"
              className="mt-1"
              aria-label={`Concluir ${t.title}`}
              checked={t.done}
              disabled={busy}
              onChange={async () => {
                try {
                  await dispatch({
                    type: "TOGGLE_PROJECT_TASK",
                    payload: { projectId: project.id, taskId: t.id },
                  });
                  if (!t.done) track("task_completed");
                  setError("");
                } catch (e) {
                  setError(message(e));
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  t.done && "line-through text-muted-foreground",
                )}
              >
                {t.title}
              </p>
              {t.description && (
                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">
                  {t.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t.responsible || "Sem responsável"}
                {t.dueDate && ` · ${formatDate(t.dueDate)}`}
                {!t.done && t.dueDate && t.dueDate < today() && (
                  <span className="text-amber-400"> · prazo vencido</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {removing === t.id ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs text-red-400 hover:underline"
                    onClick={async () => {
                      if (
                        await saveTasks(
                          project.tasks.filter((x) => x.id !== t.id),
                        )
                      )
                        setRemoving(null);
                    }}
                  >
                    Confirmar exclusão
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline ml-2"
                    onClick={() => setRemoving(null)}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    aria-label={`Editar ${t.title}`}
                    className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    onClick={() =>
                      setTask({
                        ...t,
                        description: t.description ?? "",
                        dueDate: t.dueDate ?? "",
                      })
                    }
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir ${t.title}`}
                    className="rounded p-1.5 text-muted-foreground hover:text-red-400 hover:bg-secondary"
                    onClick={() => setRemoving(t.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {task ? (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-lg border border-border p-4"
        >
          <h3 className="font-medium text-sm">
            {task.id ? "Editar tarefa" : "Nova tarefa"}
          </h3>
          <Field label="O que precisa ser feito? *">
            <input
              required
              maxLength={200}
              className={inputClass}
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
            />
          </Field>
          <Field label="Descrição">
            <textarea
              rows={3}
              maxLength={4000}
              className={inputClass}
              value={task.description ?? ""}
              onChange={(e) =>
                setTask({ ...task, description: e.target.value })
              }
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Responsável">
              <input
                className={inputClass}
                maxLength={200}
                value={task.responsible}
                onChange={(e) =>
                  setTask({ ...task, responsible: e.target.value })
                }
              />
            </Field>
            <Field label="Prazo">
              <input
                type="date"
                className={inputClass}
                value={task.dueDate ?? ""}
                onChange={(e) => setTask({ ...task, dueDate: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className={buttonClass}>
              Salvar tarefa
            </button>
            <button
              type="button"
              className={secondary}
              onClick={() => setTask(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className={secondary}
          onClick={() =>
            setTask({ ...blankTask(), responsible: project.responsible })
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus size={15} /> Nova tarefa
          </span>
        </button>
      )}
    </div>
  );
}

// ── Financeiro do caso ────────────────────────

function CaseFinance({ project }: { project: Project }) {
  const { state, dispatch, busy } = useWorkspace();
  const [error, setError] = useState("");
  const blank = () => ({
    description: "",
    type: "receber" as FinancialEntry["type"],
    amount: 0,
    dueDate: "",
    category: "Honorários",
  });
  const [entry, setEntry] = useState<ReturnType<typeof blank> | null>(null);
  const entries = state.financialEntries.filter(
    (f) => f.projectId === project.id,
  );
  const sum = (type: string, settled?: boolean) =>
    entries
      .filter(
        (f) =>
          f.type === type &&
          (settled === undefined ||
            ["pago", "recebido"].includes(f.status) === settled),
      )
      .reduce((total, f) => total + f.amount, 0);
  const figures: [string, number][] = [
    ["Honorários previstos", project.budget],
    ["A receber", sum("receber", false)],
    ["Recebido", sum("receber", true)],
    ["Despesas", sum("pagar")],
  ];

  async function run(action: { type: string; payload: unknown }) {
    try {
      await dispatch(action);
      setError("");
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    }
  }

  return (
    <div className="space-y-4">
      <ErrorLine error={error} />
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {figures.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-base font-semibold mt-1 tabular-nums">
              {formatCurrency(value)}
            </dd>
          </div>
        ))}
      </dl>
      {!entries.length && !entry && (
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento ligado a este caso. Honorários previstos são uma
          estimativa; o financeiro registra o que foi cobrado ou pago.
        </p>
      )}
      <ul className="divide-y divide-border">
        {entries.map((f) => {
          const settled = ["pago", "recebido"].includes(f.status);
          return (
            <li
              key={f.id}
              className="flex flex-wrap gap-3 py-3 items-center justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{f.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {f.type === "receber" ? "Receita" : "Despesa"} · {f.status} ·{" "}
                  {formatDate(f.dueDate)} · {f.category}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(f.amount)}
                </span>
                {!settled && (
                  <button
                    type="button"
                    disabled={busy}
                    className={secondary}
                    onClick={() =>
                      void run({
                        type: "UPDATE_FINANCIAL",
                        payload: {
                          id: f.id,
                          updates: {
                            status: f.type === "receber" ? "recebido" : "pago",
                            paidAt: today(),
                          },
                        },
                      })
                    }
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      {f.type === "receber" ? "Receber" : "Pagar"}
                    </span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {entry ? (
        <form
          className="space-y-3 rounded-lg border border-border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run({
              type: "CREATE_FINANCIAL",
              payload: {
                id: crypto.randomUUID(),
                ...entry,
                clientOrSupplier: project.client,
                projectId: project.id,
                status: "pendente",
              },
            });
            if (ok) setEntry(null);
          }}
        >
          <h3 className="font-medium text-sm">Novo lançamento do caso</h3>
          <Field label="Descrição *">
            <input
              required
              maxLength={200}
              className={inputClass}
              value={entry.description}
              onChange={(e) =>
                setEntry({ ...entry, description: e.target.value })
              }
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                className={inputClass}
                value={entry.type}
                onChange={(e) =>
                  setEntry({
                    ...entry,
                    type: e.target.value as FinancialEntry["type"],
                    category:
                      e.target.value === "receber" ? "Honorários" : "Despesa",
                  })
                }
              >
                <option value="receber">A receber</option>
                <option value="pagar">A pagar</option>
              </select>
            </Field>
            <Field label="Valor (R$) *">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className={inputClass}
                value={entry.amount || ""}
                onChange={(e) =>
                  setEntry({ ...entry, amount: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Vencimento *">
              <input
                required
                type="date"
                className={inputClass}
                value={entry.dueDate}
                onChange={(e) =>
                  setEntry({ ...entry, dueDate: e.target.value })
                }
              />
            </Field>
            <Field label="Categoria *">
              <input
                required
                maxLength={200}
                className={inputClass}
                value={entry.category}
                onChange={(e) =>
                  setEntry({ ...entry, category: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className={buttonClass}>
              Salvar lançamento
            </button>
            <button
              type="button"
              className={secondary}
              onClick={() => setEntry(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className={secondary}
          onClick={() => setEntry(blank())}
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus size={15} /> Novo lançamento
          </span>
        </button>
      )}
    </div>
  );
}

// ── Dados do caso ─────────────────────────────

function CaseData({ project }: { project: Project }) {
  const { state, dispatch, busy } = useWorkspace();
  const [edit, setEdit] = useState<Project>({ ...project });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const origin = state.demands.find((d) => d.id === project.demandId);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await dispatch({
            type: "UPDATE_PROJECT",
            payload: {
              id: project.id,
              updates: {
                name: edit.name,
                responsible: edit.responsible,
                dueDate: edit.dueDate,
                budget: edit.budget,
                description: edit.description ?? "",
                ...(edit.service ? { service: edit.service } : {}),
                customValues: edit.customValues ?? {},
              },
            },
          });
          setError("");
          setSaved(true);
        } catch (e) {
          setSaved(false);
          setError(message(e));
        }
      }}
    >
      <ErrorLine error={error} />
      <Field label="Nome *">
        <input
          required
          maxLength={200}
          className={inputClass}
          value={edit.name}
          onChange={(e) => setEdit({ ...edit, name: e.target.value })}
        />
      </Field>
      <Field label="Descrição">
        <textarea
          rows={3}
          maxLength={8000}
          className={inputClass}
          value={edit.description ?? ""}
          onChange={(e) => setEdit({ ...edit, description: e.target.value })}
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Cliente">
          <input className={inputClass} value={edit.client} disabled />
        </Field>
        <Field label="Serviço">
          <select
            className={inputClass}
            value={edit.service ?? ""}
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
            maxLength={200}
            value={edit.responsible}
            onChange={(e) => setEdit({ ...edit, responsible: e.target.value })}
          />
        </Field>
        <Field label="Prazo">
          <input
            type="date"
            className={inputClass}
            value={edit.dueDate}
            onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })}
          />
        </Field>
        <Field label="Honorários previstos (R$)">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={edit.budget}
            onChange={(e) =>
              setEdit({ ...edit, budget: Number(e.target.value) })
            }
          />
        </Field>
        <CustomFields
          entity="project"
          values={edit.customValues || {}}
          change={(customValues) => setEdit({ ...edit, customValues })}
        />
      </div>
      {origin && (
        <p className="text-xs text-muted-foreground">
          Origem: demanda “{origin.title}”.
        </p>
      )}
      <div className="flex items-center gap-3">
        <button disabled={busy} className={buttonClass}>
          Salvar dados
        </button>
        {saved && (
          <span className="text-xs text-primary" role="status">
            Dados salvos.
          </span>
        )}
      </div>
    </form>
  );
}

// ── Caso aberto ───────────────────────────────

function CaseDetail({
  project,
  stages,
  close,
  onMove,
}: {
  project: Project;
  stages: Stage[];
  close: () => void;
  onMove: (stageId: string) => void;
}) {
  const { busy } = useWorkspace();
  const [tab, setTab] = useState<Tab>("tarefas");
  const tabs: [Tab, string][] = [
    ["tarefas", `Tarefas (${project.tasks.length})`],
    ["financeiro", "Financeiro"],
    ["dados", "Dados do caso"],
  ];
  return (
    <Modal title={project.name} close={close} wide>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground -mt-3">
          {project.client}
          {project.service && ` · ${project.service}`} ·{" "}
          {project.responsible || "Sem responsável"}
          {project.dueDate && ` · prazo ${formatDate(project.dueDate)}`}
        </p>
        {project.description && (
          <p className="text-sm whitespace-pre-line">{project.description}</p>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Etapa</p>
          <div className="flex flex-wrap gap-2">
            {stages.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                aria-pressed={s.id === project.phase}
                onClick={() => s.id !== project.phase && onMove(s.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  s.id === project.phase
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div role="tablist" className="flex gap-1 border-b border-border">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "px-3 py-2 text-sm border-b-2 -mb-px",
                tab === id
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "tarefas" && <Tasks project={project} />}
        {tab === "financeiro" && <CaseFinance project={project} />}
        {tab === "dados" && <CaseData key={project.id} project={project} />}
      </div>
    </Modal>
  );
}

// ── Novo caso ─────────────────────────────────

function NewCase({
  stages,
  close,
  created,
}: {
  stages: Stage[];
  close: () => void;
  created: (name: string) => void;
}) {
  const { state, dispatch, busy } = useWorkspace();
  const open = state.demands.filter(
    (d) => !d.projectId && !["convertida", "cancelada"].includes(d.status),
  );
  const [mode, setMode] = useState<"demanda" | "zero">(
    open.length ? "demanda" : "zero",
  );
  const [demandId, setDemandId] = useState(open[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    client: "",
    service: "",
    responsible: "",
    phase: stages[0]?.id ?? "",
    dueDate: "",
    budget: 0,
    description: "",
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (mode === "demanda") {
        const demand = open.find((d) => d.id === demandId) as
          | Demand
          | undefined;
        if (!demand) throw new Error("Escolha uma demanda.");
        if (demand.status !== "aprovada")
          await dispatch({
            type: "UPDATE_DEMAND",
            payload: { id: demand.id, updates: { status: "aprovada" } },
          });
        await dispatch({
          type: "CONVERT_DEMAND",
          payload: { demandId: demand.id, customValues: values },
        });
        created(demand.title);
      } else {
        const existing = state.clients.find(
          (c) => c.name.trim().toLowerCase() === form.client.trim().toLowerCase(),
        );
        await dispatch({
          type: "CREATE_PROJECT",
          payload: {
            id: `P-${crypto.randomUUID()}`,
            name: form.name.trim(),
            client: existing?.name ?? form.client.trim(),
            ...(existing ? { clientId: existing.id } : {}),
            ...(form.service ? { service: form.service } : {}),
            responsible: form.responsible,
            phase: form.phase,
            progress: 0,
            dueDate: form.dueDate,
            budget: form.budget,
            plannedCost: 0,
            realizedCost: 0,
            health: "saudavel",
            description: form.description,
            tasks: [],
            phases: [],
            history: [],
            customValues: values,
          },
        });
        created(form.name.trim());
      }
    } catch (e) {
      setError(message(e));
    }
  }

  return (
    <Modal title="Novo caso" close={close}>
      <form className="space-y-4" onSubmit={submit}>
        <ErrorLine error={error} />
        <fieldset className="flex gap-2">
          <legend className="sr-only">Origem do caso</legend>
          {(
            [
              ["demanda", "A partir de uma demanda"],
              ["zero", "Do zero"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              disabled={id === "demanda" && !open.length}
              onClick={() => setMode(id)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm disabled:opacity-40",
                mode === id
                  ? "border-primary text-foreground bg-primary/10"
                  : "border-border text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </fieldset>
        {mode === "demanda" ? (
          <>
            <Field label="Demanda *">
              <select
                required
                className={inputClass}
                value={demandId}
                onChange={(e) => setDemandId(e.target.value)}
              >
                {open.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} · {d.client}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-sm text-muted-foreground">
              O caso usa cliente, responsável, prazo, honorários e descrição da
              demanda. Criar o caso aprova a demanda.
            </p>
          </>
        ) : (
          <>
            <Field label="Nome do caso *">
              <input
                required
                maxLength={200}
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Cliente *">
              <input
                required
                maxLength={200}
                list="clientes-do-escritorio"
                className={inputClass}
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
              />
              <datalist id="clientes-do-escritorio">
                {state.clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Serviço">
                <select
                  className={inputClass}
                  value={form.service}
                  onChange={(e) =>
                    setForm({ ...form, service: e.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {state.configuration?.services.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Etapa inicial">
                <select
                  className={inputClass}
                  value={form.phase}
                  onChange={(e) => setForm({ ...form, phase: e.target.value })}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Responsável">
                <input
                  maxLength={200}
                  className={inputClass}
                  value={form.responsible}
                  onChange={(e) =>
                    setForm({ ...form, responsible: e.target.value })
                  }
                />
              </Field>
              <Field label="Prazo">
                <input
                  type="date"
                  className={inputClass}
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Honorários previstos (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.budget || ""}
                  onChange={(e) =>
                    setForm({ ...form, budget: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Field label="Descrição">
              <textarea
                rows={3}
                maxLength={8000}
                className={inputClass}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
          </>
        )}
        <CustomFields entity="project" values={values} change={setValues} />
        <button disabled={busy} className={buttonClass}>
          Criar caso
        </button>
      </form>
    </Modal>
  );
}

// ── Página ────────────────────────────────────

export function Cases() {
  const { state, dispatch, busy } = useWorkspace();
  const stages: Stage[] = state.configuration?.stages ?? [];
  const [view, setView] = useState<View>("quadro");
  const [search, setSearch] = useState("");
  const [responsible, setResponsible] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Nome do caso recém-criado: abre assim que ele aparecer no estado.
  const [pendingOpen, setPendingOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingOpen) return;
    const created = state.projects.find((p) => p.name === pendingOpen);
    if (created) {
      setOpenId(created.id);
      setPendingOpen(null);
    }
  }, [pendingOpen, state.projects]);

  const people = useMemo(
    () =>
      [
        ...new Set(state.projects.map((p) => p.responsible).filter(Boolean)),
      ].sort(),
    [state.projects],
  );
  const term = search.trim().toLowerCase();
  const visible = state.projects.filter(
    (p) =>
      (!responsible || p.responsible === responsible) &&
      (!term ||
        [p.name, p.client, p.responsible, p.service ?? ""].some((v) =>
          v.toLowerCase().includes(term),
        )),
  );
  const opened = state.projects.find((p) => p.id === openId);
  const stageOf = (p: Project) =>
    stages.some((s) => s.id === p.phase) ? p.phase : stages[0]?.id;

  async function move(project: Project, stageId: string) {
    if (project.phase === stageId) return;
    try {
      await dispatch({
        type: "UPDATE_PROJECT",
        payload: { id: project.id, updates: { phase: stageId } },
      });
      track("case_stage_changed", {
        stage_index: stages.findIndex((s) => s.id === stageId),
      });
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }

  return (
    <Page
      title="Casos e serviços"
      subtitle="Arraste o caso entre as etapas ou abra para ver tarefas e financeiro."
      action={
        <button className={buttonClass} onClick={() => setCreating(true)}>
          <Plus size={16} />
          Novo caso
        </button>
      }
    >
      <ErrorLine error={error} />
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          aria-label="Buscar casos"
          className={cn(inputClass, "max-w-xs")}
          placeholder="Buscar por caso, cliente ou serviço"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filtrar por responsável"
          className={cn(inputClass, "max-w-[14rem]")}
          value={responsible}
          onChange={(e) => setResponsible(e.target.value)}
        >
          <option value="">Todos os responsáveis</option>
          {people.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <div
          className="ml-auto inline-flex rounded-md border border-border overflow-hidden"
          role="group"
          aria-label="Forma de visualização"
        >
          {(
            [
              ["quadro", "Quadro", LayoutGrid],
              ["lista", "Lista", List],
            ] as const
          ).map(([id, text, Icon]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm",
                view === id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={15} />
              {text}
            </button>
          ))}
        </div>
      </div>

      {!state.projects.length ? (
        <Empty>
          Nenhum caso ainda. Crie um em “Novo caso” ou peça à Domus AI.
        </Empty>
      ) : !visible.length ? (
        <Empty>Nenhum caso corresponde à busca.</Empty>
      ) : view === "quadro" ? (
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => {
              const items = visible.filter((p) => stageOf(p) === stage.id);
              return (
                <section
                  key={stage.id}
                  aria-label={`Etapa ${stage.label}`}
                  onDragOver={(e) => {
                    if (!dragging) return;
                    e.preventDefault();
                    setOver(stage.id);
                  }}
                  onDragLeave={() =>
                    setOver((current) => (current === stage.id ? null : current))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    const project = state.projects.find(
                      (p) => p.id === dragging,
                    );
                    setDragging(null);
                    setOver(null);
                    if (project) void move(project, stage.id);
                  }}
                  className={cn(
                    "w-72 shrink-0 rounded-xl border p-3 transition-colors",
                    over === stage.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-secondary/20",
                  )}
                >
                  <header className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-semibold">{stage.label}</h2>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {items.length}
                    </span>
                  </header>
                  <div className="space-y-3 min-h-[4rem]">
                    {items.map((p) => (
                      <CaseCard
                        key={p.id}
                        project={p}
                        stages={stages}
                        busy={busy}
                        onOpen={() => setOpenId(p.id)}
                        onMove={(stageId) => void move(p, stageId)}
                        onDragStart={() => setDragging(p.id)}
                      />
                    ))}
                    {!items.length && (
                      <p className="text-xs text-muted-foreground px-1 py-4 text-center">
                        Solte um caso aqui
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="font-medium p-3">Caso</th>
                <th className="font-medium p-3">Cliente</th>
                <th className="font-medium p-3">Etapa</th>
                <th className="font-medium p-3">Responsável</th>
                <th className="font-medium p-3">Tarefas</th>
                <th className="font-medium p-3">Prazo</th>
                <th className="font-medium p-3 text-right">Honorários</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/30"
                >
                  <td className="p-3">
                    <button
                      type="button"
                      className="font-medium text-left hover:text-primary hover:underline"
                      onClick={() => setOpenId(p.id)}
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.client}</td>
                  <td className="p-3">
                    <select
                      aria-label={`Etapa de ${p.name}`}
                      className={cn(inputClass, "py-1")}
                      disabled={busy}
                      value={stageOf(p)}
                      onChange={(e) => void move(p, e.target.value)}
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {p.responsible || "Sem responsável"}
                  </td>
                  <td className="p-3 text-muted-foreground tabular-nums">
                    {p.tasks.filter((t) => t.done).length}/{p.tasks.length}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {p.dueDate ? formatDate(p.dueDate) : "Sem prazo"}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {formatCurrency(p.budget)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {opened && (
        <CaseDetail
          project={opened}
          stages={stages}
          close={() => setOpenId(null)}
          onMove={(stageId) => void move(opened, stageId)}
        />
      )}
      {creating && (
        <NewCase
          stages={stages}
          close={() => setCreating(false)}
          created={(name) => {
            setCreating(false);
            setSearch("");
            setResponsible("");
            setPendingOpen(name);
          }}
        />
      )}
    </Page>
  );
}
