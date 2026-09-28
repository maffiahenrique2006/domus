import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { useLocation } from "wouter";
import { Sparkles, Send, Plus, Trash2 } from "lucide-react";
import { api, useWorkspace } from "@/data/store";
import { PersistedUsage } from "@/components/persisted-usage";
import type { Configuration, Workspace } from "@/data/types";
import { Page, Field, inputClass, buttonClass } from "./legal-workspace";

type Interview = {
  messages: {
    role: string;
    content?: string;
    text?: string;
    questions?: string[];
  }[];
  proposal: Configuration | null;
  usage?: { totalTokens?: number; inputTokens?: number; outputTokens?: number };
};
export default function Onboarding() {
  const { state, replace, refresh } = useWorkspace();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Interview["messages"]>([]);
  const [proposal, setProposal] = useState<Configuration | null>(
    state.configuration,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [usage, setUsage] = useState<Interview["usage"]>();
  const [usageRefresh, setUsageRefresh] = useState(0);
  useEffect(() => {
    api<Interview>("/api/onboarding")
      .then((d) => {
        setMessages(d.messages || []);
        setProposal(d.proposal || state.configuration);
        setUsage(d.usage);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e.message);
        setLoaded(true);
      });
  }, []);
  async function interview(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api<{
        reply: string;
        questions: string[];
        configuration: Configuration | null;
        usage: Interview["usage"];
      }>("/api/onboarding/interview", { message });
      track("onboarding_interview_sent", {
        proposal_ready: Boolean(result.configuration),
        questions: result.questions.length,
      });
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        {
          role: "assistant",
          content:
            result.reply +
            (result.questions?.length
              ? "\n\n" + result.questions.join("\n")
              : ""),
        },
      ]);
      setMessage("");
      if (result.configuration) setProposal(result.configuration);
      setUsage(result.usage);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setUsageRefresh(value => value + 1);
    }
  }
  async function confirm() {
    if (!proposal) return;
    setError("");
    setBusy(true);
    try {
      replace(
        await api<Workspace>("/api/onboarding/confirm", {
          configuration: proposal,
          revision: state.revision,
        }),
      );
      track("onboarding_confirmed", {
        services: proposal.services.length,
        stages: proposal.stages.length,
        fields: proposal.fields.length,
      });
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title={
        state.company.onboarded
          ? "Configuração do escritório"
          : "Vamos conhecer seu escritório"
      }
      subtitle="Conte como você trabalha. A Domus organiza a proposta e você decide antes de criar."
    >
      <div className="grid xl:grid-cols-2 gap-6 max-w-6xl">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-primary" />
            <h2 className="font-semibold">Conversa com a Domus</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Descreva o nome do escritório, áreas de atuação, demandas que quer
            organizar, etapas e informações indispensáveis. Perguntaremos apenas
            o que faltar. Use dados fictícios na demonstração.
          </p>
          <div
            aria-live="polite"
            className="space-y-3 max-h-[45vh] overflow-y-auto mb-5"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary/10 ml-6" : "bg-secondary mr-6"}`}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {m.role === "user" ? "Você" : "Domus"}
                </p>
                {m.content || m.text}
                {m.questions?.length ? "\n\n" + m.questions.join("\n") : ""}
              </div>
            ))}
          </div>
          <form onSubmit={interview}>
            <label htmlFor="business-description" className="text-sm">
              {messages.length
                ? "Sua resposta"
                : "Como funciona seu escritório?"}
            </label>
            <textarea
              id="business-description"
              required
              minLength={5}
              maxLength={6000}
              className={`${inputClass} mt-2 min-h-32`}
              placeholder="Somos o Almeida Advocacia, trabalhamos com contratos e direito empresarial. Recebemos pedidos por e-mail, analisamos documentos, elaboramos a minuta e enviamos ao cliente. Precisamos acompanhar responsável, prazo, tipo de contrato e honorários."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              disabled={busy || !loaded || !message.trim()}
              className={`${buttonClass} mt-3`}
            >
              <Send size={16} />
              {busy ? "Processando…" : "Enviar à Domus"}
            </button>
          </form>
          {usage && (
            <p className="text-xs text-muted-foreground mt-4">
              Última resposta da entrevista:{" "}
              {usage.totalTokens ??
                (usage.inputTokens || 0) + (usage.outputTokens || 0)}{" "}
              tokens
            </p>
          )}
          <PersistedUsage refreshKey={usageRefresh} />
          <p className="text-xs text-muted-foreground mt-4">
            Este sistema organiza a operação. Não realiza consultas jurídicas
            nem calcula prazos processuais.
          </p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-2">Prévia do seu sistema</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Revise e ajuste. Nenhum cliente, caso ou valor será inventado.
          </p>
          {!proposal ? (
            <p className="py-10 text-sm text-muted-foreground">
              Sua configuração aparecerá aqui após a entrevista.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">
                {proposal.summary}
              </p>
              <Field label="Nome do escritório">
                <input
                  className={inputClass}
                  maxLength={120}
                  value={proposal.companyName}
                  onChange={(e) =>
                    setProposal({ ...proposal, companyName: e.target.value })
                  }
                />
              </Field>
              <Field label="Principal dificuldade que vamos organizar">
                <input
                  required
                  className={inputClass}
                  value={proposal.briefing.pain}
                  onChange={(e) =>
                    setProposal({
                      ...proposal,
                      briefing: { ...proposal.briefing, pain: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Como chegam os pedidos">
                <input
                  required
                  className={inputClass}
                  value={proposal.briefing.intake}
                  onChange={(e) =>
                    setProposal({
                      ...proposal,
                      briefing: {
                        ...proposal.briefing,
                        intake: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Como o trabalho é distribuído">
                <input
                  required
                  className={inputClass}
                  value={proposal.briefing.responsibility}
                  onChange={(e) =>
                    setProposal({
                      ...proposal,
                      briefing: {
                        ...proposal.briefing,
                        responsibility: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Controle financeiro desejado">
                <select
                  className={inputClass}
                  value={proposal.briefing.financialNeeds}
                  onChange={(e) =>
                    setProposal({
                      ...proposal,
                      briefing: {
                        ...proposal.briefing,
                        financialNeeds: e.target
                          .value as Configuration["briefing"]["financialNeeds"],
                      },
                    })
                  }
                >
                  <option value="ambos">Contas a pagar e receber</option>
                  <option value="receber">Contas a receber</option>
                  <option value="pagar">Contas a pagar</option>
                  <option value="nenhum">Não é prioridade agora</option>
                </select>
              </Field>
              <Field label="Serviços (um por linha)">
                <textarea
                  className={inputClass}
                  value={proposal.services.join("\n")}
                  onChange={(e) =>
                    setProposal({
                      ...proposal,
                      services: e.target.value.split("\n"),
                    })
                  }
                />
              </Field>
              <fieldset>
                <legend className="text-sm text-muted-foreground mb-2">
                  Etapas dos casos
                </legend>
                {proposal.stages.map((s, i) => (
                  <div className="flex items-center gap-2 mb-2" key={s.id}>
                    <span className="text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <input
                      aria-label={`Etapa ${i + 1}`}
                      className={inputClass}
                      value={s.label}
                      onChange={(e) =>
                        setProposal({
                          ...proposal,
                          stages: proposal.stages.map((v, j) =>
                            j === i ? { ...v, label: e.target.value } : v,
                          ),
                        })
                      }
                    />
                    {!state.company.onboarded && (
                      <button
                        aria-label={`Remover etapa ${s.label}`}
                        onClick={() =>
                          setProposal({
                            ...proposal,
                            stages: proposal.stages.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="text-sm text-primary flex gap-1 items-center"
                  onClick={() =>
                    setProposal({
                      ...proposal,
                      stages: [
                        ...proposal.stages,
                        {
                          id: `etapa_${crypto.randomUUID().slice(0, 8)}`,
                          label: "Nova etapa",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={15} />
                  Adicionar etapa
                </button>
              </fieldset>
              <fieldset>
                <legend className="text-sm text-muted-foreground mb-2">
                  Campos personalizados
                </legend>
                {proposal.fields.map((f, i) => (
                  <div
                    key={f.id}
                    className="border border-border rounded-lg p-3 space-y-2 mb-3"
                  >
                    <input
                      aria-label="Nome do campo"
                      disabled={state.configuration?.fields.some(
                        (old) => old.id === f.id,
                      )}
                      className={inputClass}
                      value={f.label}
                      onChange={(e) =>
                        setProposal({
                          ...proposal,
                          fields: proposal.fields.map((v, j) =>
                            j === i ? { ...v, label: e.target.value } : v,
                          ),
                        })
                      }
                    />
                    <div className="flex gap-2">
                      <select
                        aria-label="Onde usar o campo"
                        disabled={state.configuration?.fields.some(
                          (old) => old.id === f.id,
                        )}
                        className={inputClass}
                        value={f.entity}
                        onChange={(e) =>
                          setProposal({
                            ...proposal,
                            fields: proposal.fields.map((v, j) =>
                              j === i
                                ? {
                                    ...v,
                                    entity: e.target.value as
                                      "demand" | "project",
                                  }
                                : v,
                            ),
                          })
                        }
                      >
                        <option value="demand">Demanda</option>
                        <option value="project">Caso</option>
                      </select>
                      <select
                        aria-label="Tipo do campo"
                        disabled={state.configuration?.fields.some(
                          (old) => old.id === f.id,
                        )}
                        className={inputClass}
                        value={f.type}
                        onChange={(e) =>
                          setProposal({
                            ...proposal,
                            fields: proposal.fields.map((v, j) =>
                              j === i
                                ? {
                                    ...v,
                                    type: e.target.value as
                                      "text" | "number" | "select",
                                    options:
                                      e.target.value === "select"
                                        ? v.options
                                        : [],
                                  }
                                : v,
                            ),
                          })
                        }
                      >
                        <option value="text">Texto</option>
                        <option value="number">Número</option>
                        <option value="select">Seleção</option>
                      </select>
                    </div>
                    {f.type === "select" && (
                      <Field label="Opções separadas por vírgulas">
                        <input
                          className={inputClass}
                          value={f.options.join(",")}
                          disabled={state.configuration?.fields.some(
                            (old) => old.id === f.id,
                          )}
                          onChange={(e) =>
                            setProposal({
                              ...proposal,
                              fields: proposal.fields.map((v, j) =>
                                j === i
                                  ? {
                                      ...v,
                                      options: e.target.value
                                        .split(",")
                                        .map((s) => s.trim()),
                                    }
                                  : v,
                              ),
                            })
                          }
                        />
                      </Field>
                    )}
                    <div className="flex justify-between">
                      <label className="text-xs flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={f.required}
                          disabled={state.company.onboarded}
                          onChange={(e) =>
                            setProposal({
                              ...proposal,
                              fields: proposal.fields.map((v, j) =>
                                j === i
                                  ? { ...v, required: e.target.checked }
                                  : v,
                              ),
                            })
                          }
                        />
                        Obrigatório
                      </label>
                      {!state.configuration?.fields.some(
                        (old) => old.id === f.id,
                      ) && (
                        <button
                          className="text-xs text-muted-foreground"
                          onClick={() =>
                            setProposal({
                              ...proposal,
                              fields: proposal.fields.filter((_, j) => j !== i),
                            })
                          }
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  className="text-sm text-primary flex gap-1 items-center"
                  onClick={() =>
                    setProposal({
                      ...proposal,
                      fields: [
                        ...proposal.fields,
                        {
                          id: `campo_${crypto.randomUUID().slice(0, 8)}`,
                          label: "Novo campo",
                          type: "text",
                          entity: "demand",
                          required: false,
                          options: [],
                        },
                      ],
                    })
                  }
                >
                  <Plus size={15} />
                  Adicionar campo
                </button>
              </fieldset>
              <p className="text-xs text-muted-foreground">
                Módulos: clientes, demandas, casos, tarefas e financeiro. Você
                revisará prazos e dados antes de usá-los.
                {state.company.onboarded &&
                  " Campos já utilizados são preservados. Novos campos devem ser opcionais."}
              </p>
              <button
                disabled={busy}
                className={`${buttonClass} w-full`}
                onClick={() => void confirm()}
              >
                {state.company.onboarded
                  ? "Salvar configuração"
                  : "Confirmar e criar meu sistema"}
              </button>
            </div>
          )}
        </section>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400"
        >
          {error}
        </p>
      )}
    </Page>
  );
}
