import { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Triangle,
  Plus,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { api, useWorkspace } from "@/data/store";
import type { Workspace } from "@/data/types";
import { PersistedUsage } from "@/components/persisted-usage";

// ── Types ──────────────────────────────────────

type Role = "user" | "ai";

// Cadastro por conversa: a IA propõe, o gestor confirma, o servidor valida e grava.
type ProposalStatus = "pendente" | "salvando" | "confirmada" | "erro";

interface ClientProposal {
  kind: "client";
  name: string;
  email: string;
}

interface DemandProposal {
  kind: "demand";
  title: string;
  client: string;
  service: string;
  responsible: string;
  priority: "urgente" | "alta" | "media" | "baixa";
  dueDate: string;
  estimatedValue: number;
  description: string;
  customValues: Record<string, string | number>;
  missing: string[];
}

type Proposal = (ClientProposal | DemandProposal) & {
  key: string;
  status: ProposalStatus;
  error?: string;
};

interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: string;
  actions?: { label: string; href: string }[];
  proposals?: Proposal[];
}

interface SessionUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

const ZERO_USAGE: SessionUsage = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};
// ── Helpers ────────────────────────────────────

function now(offsetMin = 0) {
  const d = new Date(Date.now() - offsetMin * 60000);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "ai",
  text: "Olá! Sou a Domus AI. Posso consultar um resumo dos seus casos, demandas e financeiro, e também preparar o cadastro de clientes e demandas: você descreve, eu proponho, e nada é salvo sem a sua confirmação. Não substituo a análise jurídica nem calculo prazos processuais. O que você quer organizar?",
  timestamp: now(),
};

const SUGGESTIONS = [
  "Como devo priorizar minhas demandas essa semana?",
  "O que olhar antes de fechar o mês no financeiro?",
  "Quais casos precisam de atenção e por quê?",
  "Quais tarefas estão pendentes no escritório?",
];

// ── Message bubble ────────────────────────────

function MessageBubble({
  msg,
  onAction,
}: {
  msg: Message;
  onAction: (href: string) => void;
}) {
  const isUser = msg.role === "user";

  // Simple markdown-lite: bold (**text**), bullet (• or -), newlines
  function renderText(text: string) {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p
          key={i}
          className={cn("leading-relaxed", i > 0 && line === "" ? "h-2" : "")}
        >
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold text-foreground">
                {part}
              </strong>
            ) : (
              part
            ),
          )}
        </p>
      );
    });
  }

  return (
    <div
      className={cn(
        "flex gap-3 max-w-[88%]",
        isUser ? "ml-auto flex-row-reverse" : "",
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 mt-0.5">
          <Triangle className="h-3.5 w-3.5 fill-primary text-primary" />
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-1.5",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border text-foreground rounded-tl-sm",
          )}
        >
          <div
            className={cn(
              "space-y-1",
              isUser ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {renderText(msg.text)}
          </div>
        </div>

        {/* Action buttons */}
        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {msg.actions.map((a) => (
              <button
                key={a.href}
                onClick={() => onAction(a.href)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary border border-border text-foreground hover:bg-secondary/80 hover:border-primary/30 transition-all"
              >
                {a.label} →
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground px-1">
          {msg.timestamp}
        </p>
      </div>
    </div>
  );
}

// ── Proposal cards ────────────────────────────

const PRIORITY_LABEL: Record<DemandProposal["priority"], string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function ProposalCard({
  proposal,
  fieldLabels,
  disabled,
  onConfirm,
  onDiscard,
}: {
  proposal: Proposal;
  fieldLabels: Record<string, string>;
  disabled: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const isClient = proposal.kind === "client";
  const details: [string, string][] = isClient
    ? [["E-mail", proposal.email]]
    : [
        ["Cliente", proposal.client],
        ["Serviço", proposal.service],
        ["Responsável", proposal.responsible],
        ["Prioridade", PRIORITY_LABEL[proposal.priority]],
        ["Prazo", proposal.dueDate ? formatDate(proposal.dueDate) : ""],
        [
          "Honorários estimados",
          proposal.estimatedValue ? formatCurrency(proposal.estimatedValue) : "",
        ],
        ...Object.entries(proposal.customValues).map(
          ([id, value]) => [fieldLabels[id] ?? id, String(value)] as [string, string],
        ),
      ];
  const missing = isClient ? [] : proposal.missing;
  const confirmed = proposal.status === "confirmada";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-4 py-3 text-sm",
        confirmed ? "border-primary/40" : "border-border",
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
        {isClient ? "Proposta de cliente" : "Proposta de demanda"}
      </p>
      <p className="mt-0.5 font-semibold text-foreground">
        {isClient ? proposal.name : proposal.title}
      </p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {details
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex gap-1.5">
              <dt className="text-muted-foreground">{label}:</dt>
              <dd className="text-foreground">{value}</dd>
            </div>
          ))}
      </dl>
      {missing.length > 0 && !confirmed && (
        <p className="mt-2 text-xs text-destructive">
          Falta informar: {missing.join(", ")}. Diga no chat ou cadastre pela
          tela de Demandas.
        </p>
      )}
      {proposal.status === "erro" && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {proposal.error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {confirmed ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Check className="h-3.5 w-3.5" />
            Salvo no escritório
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={onConfirm}
              disabled={disabled || missing.length > 0}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {proposal.status === "salvando" ? "Salvando…" : "Confirmar cadastro"}
            </button>
            <button
              type="button"
              onClick={onDiscard}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Descartar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[88%]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
        <Triangle className="h-3.5 w-3.5 fill-primary text-primary" />
      </div>
      <div className="flex items-center gap-1 bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Session usage panel ────────────────────────

function SessionUsagePanel({
  usage,
  onReset,
}: {
  usage: SessionUsage;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border text-[11px] text-muted-foreground max-w-full">
      <span className="font-medium text-foreground">Uso desta sessão</span>
      <span>
        {usage.calls} chamada{usage.calls === 1 ? "" : "s"}
      </span>
      <span>· entrada {usage.inputTokens} tok</span>
      <span>· saída {usage.outputTokens} tok</span>
      <span>· total {usage.totalTokens} tok</span>
      <button
        type="button"
        onClick={onReset}
        title="Zerar medição da sessão"
        className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border hover:border-primary/30 hover:text-foreground transition-all"
      >
        <RotateCcw className="h-2.5 w-2.5" />
        Zerar medição da sessão
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────

export default function DomusAIPage() {
  const { state, replace } = useWorkspace();
  // Espelhos do estado mais recente, para confirmar várias propostas em sequência.
  const revisionRef = useRef(state.revision);
  const clientsRef = useRef(state.clients);
  revisionRef.current = state.revision;
  clientsRef.current = state.clients;
  const [saving, setSaving] = useState(false);
  const fieldLabels = Object.fromEntries(
    (state.configuration?.fields ?? []).map((f) => [f.id, f.label]),
  );
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<SessionUsage>(ZERO_USAGE);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [usageRefresh, setUsageRefresh] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    api<{ id: number; role: string; content: string; createdAt: string }[]>(
      "/api/chat/messages",
    )
      .then((rows) =>
        setMessages([
          WELCOME_MESSAGE,
          ...rows.map((m) => ({
            id: String(m.id),
            role: (m.role === "user" ? "user" : "ai") as Role,
            text: m.content,
            timestamp: new Date(m.createdAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        ]),
      )
      .catch((e) => setError(e.message))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function resetUsage() {
    setUsage(ZERO_USAGE);
  }

  function patchProposal(
    messageId: string,
    key: string,
    patch: Partial<Proposal> | null,
  ) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id !== messageId
          ? m
          : {
              ...m,
              proposals: (m.proposals ?? []).flatMap((p) =>
                p.key !== key ? [p] : patch ? [{ ...p, ...patch } as Proposal] : [],
              ),
            },
      ),
    );
  }

  // Grava pela mesma rota dos formulários: o servidor valida tudo de novo.
  async function saveProposal(p: Proposal) {
    const same = (a: string, b: string) =>
      a.trim().toLowerCase() === b.trim().toLowerCase();
    let action: { type: string; payload: unknown };
    if (p.kind === "client") {
      action = {
        type: "CREATE_CLIENT",
        payload: {
          id: crypto.randomUUID(),
          name: p.name,
          email: p.email,
          phone: "",
        },
      };
    } else {
      const existing = clientsRef.current.find((c) => same(c.name, p.client));
      action = {
        type: "CREATE_DEMAND",
        payload: {
          id: crypto.randomUUID(),
          title: p.title,
          client: existing?.name ?? p.client,
          ...(existing ? { clientId: existing.id } : {}),
          ...(p.service ? { service: p.service } : {}),
          responsible: p.responsible || null,
          priority: p.priority,
          status: "nova",
          dueDate: p.dueDate,
          estimatedValue: p.estimatedValue,
          description: p.description,
          origin: "Domus AI",
          createdAt: new Date().toISOString(),
          comments: [],
          history: [],
          files: [],
          customValues: p.customValues,
        },
      };
    }
    const workspace = await api<Workspace>("/api/workspace/actions", {
      ...action,
      revision: revisionRef.current,
    });
    revisionRef.current = workspace.revision;
    clientsRef.current = workspace.clients;
    replace(workspace);
  }

  async function confirmProposals(messageId: string, list: Proposal[]) {
    if (saving) return;
    setSaving(true);
    try {
      for (const p of list) {
        patchProposal(messageId, p.key, { status: "salvando", error: undefined });
        try {
          await saveProposal(p);
          patchProposal(messageId, p.key, { status: "confirmada" });
        } catch (e) {
          patchProposal(messageId, p.key, {
            status: "erro",
            error: e instanceof Error ? e.message : "Não foi possível salvar.",
          });
          // Depois de um erro, busca a revisão atual antes de tentar a próxima.
          try {
            const fresh = await api<Workspace>("/api/workspace");
            revisionRef.current = fresh.revision;
            clientsRef.current = fresh.clients;
            replace(fresh);
          } catch {
            break;
          }
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing || historyLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: trimmed,
      timestamp: now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          body && typeof body.error === "string"
            ? body.error
            : "Não foi possível falar com a Domus AI agora. Tente novamente em instantes.";
        setError(message);
        return;
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: body.message.content,
        timestamp: now(),
        proposals: Array.isArray(body.proposals)
          ? body.proposals.map((p: ClientProposal | DemandProposal, i: number) => ({
              ...p,
              key: `${Date.now()}-${i}`,
              status: "pendente" as ProposalStatus,
            }))
          : [],
      };
      setMessages((prev) => [...prev, aiMsg]);

      setUsage((prev) => {
        const next: SessionUsage = {
          calls: prev.calls + 1,
          inputTokens: prev.inputTokens + (body.usage?.inputTokens ?? 0),
          outputTokens: prev.outputTokens + (body.usage?.outputTokens ?? 0),
          totalTokens: prev.totalTokens + (body.usage?.totalTokens ?? 0),
        };
        return next;
      });
    } catch {
      setError(
        "Não foi possível conectar à Domus AI. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setTyping(false);
      setUsageRefresh((value) => value + 1);
    }
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    sendMessage(input);
  }

  function handleSuggestion(s: string) {
    sendMessage(s);
    inputRef.current?.focus();
  }

  return (
    <div className="h-full flex flex-col bg-background pb-16 md:pb-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 md:px-8 py-4 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Triangle className="h-4 w-4 fill-primary text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground leading-tight">
                  Domus AI
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assistente de gestão · {state.company.name}
              </p>
            </div>
          </div>
          <SessionUsagePanel usage={usage} onReset={resetUsage} />
        </div>
        <PersistedUsage refreshKey={usageRefresh} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
        {/* Welcome note */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Respostas reais da OpenAI com um resumo da operação do seu
            escritório. Revise as orientações antes de agir.
          </div>
        </div>

        {messages.map((msg) => {
          const proposals = msg.proposals ?? [];
          const ready = proposals.filter(
            (p) =>
              p.status !== "confirmada" &&
              (p.kind === "client" || p.missing.length === 0),
          );
          return (
            <div key={msg.id} className="space-y-3">
              <MessageBubble msg={msg} onAction={navigate} />
              {proposals.length > 0 && (
                <div className="ml-11 max-w-[88%] space-y-2">
                  {proposals.map((p) => (
                    <ProposalCard
                      key={p.key}
                      proposal={p}
                      fieldLabels={fieldLabels}
                      disabled={saving}
                      onConfirm={() => void confirmProposals(msg.id, [p])}
                      onDiscard={() => patchProposal(msg.id, p.key, null)}
                    />
                  ))}
                  {ready.length > 1 && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void confirmProposals(msg.id, ready)}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Confirmar os {ready.length} cadastros
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 px-4 md:px-8">
          <div className="px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            {error}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {!typing && (
        <div className="shrink-0 px-4 md:px-8 pb-2 pt-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-secondary transition-all whitespace-nowrap"
              >
                <Plus className="h-3 w-3" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 px-4 md:px-8 pb-4 pt-2 border-t border-border bg-background">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/40 transition-all">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ou peça um cadastro: clientes, demandas…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              disabled={typing || historyLoading}
              aria-label="Pergunta à Domus AI"
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
            />
          </div>
          <button
            type="submit"
            aria-label="Enviar pergunta"
            disabled={!input.trim() || typing || historyLoading}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
              input.trim() && !typing
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                : "bg-secondary text-muted-foreground cursor-not-allowed",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Perguntas e a entrevista de configuração usam tokens da OpenAI. A
          Domus AI só propõe cadastros: nada é salvo sem a sua confirmação.
        </p>
      </div>
    </div>
  );
}
