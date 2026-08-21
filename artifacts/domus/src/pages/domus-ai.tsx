import { useState, useRef, useEffect } from "react"
import { Send, Sparkles, Triangle, Plus } from "lucide-react"
import { useLocation } from "wouter"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────

type Role = "user" | "ai"

interface Message {
  id: string
  role: Role
  text: string
  timestamp: string
  actions?: { label: string; href: string }[]
}

// ── Seed conversation ──────────────────────────

function now(offsetMin = 0) {
  const d = new Date(Date.now() - offsetMin * 60000)
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

const SEED_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    text: "Quais projetos precisam de atenção essa semana?",
    timestamp: now(14),
  },
  {
    id: "2",
    role: "ai",
    text: "Dois projetos requerem atenção imediata:\n\n**P-238 — Loja Horizonte (Horizonte)**\nCusto realizado (R$ 112.400) está 8% acima do planejado (R$ 104.000). Responsável: Rafael Nunes. Prazo: 30/09/2026.\n\n**P-239 — Café Nômade (Vila Madalena)**\nA aprovação do layout final vence hoje. Helena Prado está acompanhando, mas não há confirmação do cliente ainda.\n\nDeseja que eu notifique os responsáveis ou registre uma ação de acompanhamento?",
    timestamp: now(13),
    actions: [
      { label: "Ver P-238", href: "/projetos?id=P-238" },
      { label: "Ver P-239", href: "/projetos?id=P-239" },
    ],
  },
  {
    id: "3",
    role: "user",
    text: "Qual o resultado financeiro previsto do mês?",
    timestamp: now(10),
  },
  {
    id: "4",
    role: "ai",
    text: "Aqui está o resumo financeiro da Vértice Espaços:\n\n• **Receita prevista:** R$ 248.000\n• **Receita já recebida:** R$ 72.000\n• **Despesas previstas:** R$ 176.400\n• **Despesas pagas:** R$ 15.900\n• **Resultado previsto:** R$ 71.600\n• **Margem:** 28,9%\n\n⚠️ Atenção: o recebimento de **R$ 18.500 da Alba Tecnologia** (F-005) está em atraso desde 12/08. Recomendo priorizar a cobrança.",
    timestamp: now(9),
    actions: [{ label: "Ver lançamento", href: "/financeiro?id=F-005" }],
  },
  {
    id: "5",
    role: "user",
    text: "A demanda D-1044 da Lumina está sem responsável. Pode atribuir para a Nina Alves?",
    timestamp: now(5),
  },
  {
    id: "6",
    role: "ai",
    text: "Feito! Atribuí a demanda **D-1044 — Estande para Feira Lumina** (Lumina Cosméticos, urgente) para **Nina Alves**.\n\nCom isso, o alerta \"Sem responsável\" foi removido do painel de Visão Geral. Quer que eu também avise a Nina por e-mail ou registre um comentário na demanda?",
    timestamp: now(4),
    actions: [{ label: "Ver D-1044", href: "/demandas?id=D-1044" }],
  },
]

const SUGGESTIONS = [
  "Crie uma demanda para o Grupo Marea",
  "Quais tarefas vencem essa semana?",
  "Resumo dos projetos em obra",
  "Projete o fluxo de caixa do próximo mês",
]

// ── Message bubble ────────────────────────────

function MessageBubble({ msg, onAction }: { msg: Message; onAction: (href: string) => void }) {
  const isUser = msg.role === "user"

  // Simple markdown-lite: bold (**text**), bullet (• or -), newlines
  function renderText(text: string) {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <p key={i} className={cn("leading-relaxed", i > 0 && line === "" ? "h-2" : "")}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="font-semibold text-foreground">{part}</strong> : part
          )}
        </p>
      )
    })
  }

  return (
    <div className={cn("flex gap-3 max-w-[88%]", isUser ? "ml-auto flex-row-reverse" : "")}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 mt-0.5">
          <Triangle className="h-3.5 w-3.5 fill-primary text-primary" />
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border text-foreground rounded-tl-sm"
          )}
        >
          <div className={cn("space-y-1", isUser ? "text-primary-foreground" : "text-muted-foreground")}>
            {renderText(msg.text)}
          </div>
        </div>

        {/* Action buttons */}
        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {msg.actions.map(a => (
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

        <p className="text-[10px] text-muted-foreground px-1">{msg.timestamp}</p>
      </div>
    </div>
  )
}

// ── Typing indicator ──────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[88%]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
        <Triangle className="h-3.5 w-3.5 fill-primary text-primary" />
      </div>
      <div className="flex items-center gap-1 bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────

export default function DomusAIPage() {
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES)
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [, navigate] = useLocation()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || typing) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: trimmed,
      timestamp: now(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setTyping(true)

    // Simulated AI reply after a short delay
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "Entendido! Estou processando sua solicitação com base nos dados da Vértice Espaços. Esta é uma demonstração — em produção, eu consultaria todos os módulos em tempo real para trazer uma resposta completa.",
        timestamp: now(),
      }
      setMessages(prev => [...prev, aiMsg])
      setTyping(false)
    }, 1600)
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    sendMessage(input)
  }

  function handleSuggestion(s: string) {
    sendMessage(s)
    inputRef.current?.focus()
  }

  return (
    <div className="h-full flex flex-col bg-background pb-16 md:pb-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 md:px-8 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Triangle className="h-4 w-4 fill-primary text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground leading-tight">Domus AI</h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-2.5 w-2.5" />
                Demo
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assistente inteligente da Vértice Espaços
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
        {/* Welcome note */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Conversa de demonstração — dados reais da Vértice Espaços
          </div>
        </div>

        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} onAction={navigate} />
        ))}

        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {!typing && (
        <div className="shrink-0 px-4 md:px-8 pb-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {SUGGESTIONS.map(s => (
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
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte sobre projetos, demandas, financeiro…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              disabled={typing}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
              input.trim() && !typing
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Demonstração — em produção, a Domus AI teria acesso a todos os dados em tempo real.
        </p>
      </div>
    </div>
  )
}
