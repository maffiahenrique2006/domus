import { useState, useRef, useEffect } from "react"
import { Send, Sparkles, Triangle, Plus, RotateCcw } from "lucide-react"
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

interface SessionUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

const ZERO_USAGE: SessionUsage = { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
const USAGE_STORAGE_KEY = "domus-ai-session-usage"
const SESSION_ID_STORAGE_KEY = "domus-ai-session-id"

// ── Session usage (client-side demo counter) ───

function loadUsage(): SessionUsage {
  try {
    const raw = sessionStorage.getItem(USAGE_STORAGE_KEY)
    if (!raw) return ZERO_USAGE
    const parsed = JSON.parse(raw)
    return {
      calls: Number(parsed.calls) || 0,
      inputTokens: Number(parsed.inputTokens) || 0,
      outputTokens: Number(parsed.outputTokens) || 0,
      totalTokens: Number(parsed.totalTokens) || 0,
    }
  } catch {
    return ZERO_USAGE
  }
}

function saveUsage(usage: SessionUsage) {
  try {
    sessionStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage))
  } catch {
    // sessionStorage unavailable (private mode, etc.) — the demo still works,
    // it just won't remember the counter across a reload.
  }
}

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_ID_STORAGE_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

// ── Helpers ────────────────────────────────────

function now(offsetMin = 0) {
  const d = new Date(Date.now() - offsetMin * 60000)
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "ai",
  text: "Olá! Sou a Domus AI da Vértice Espaços. Posso ajudar você a pensar sobre demandas, projetos e financeiro. O que você quer resolver agora?",
  timestamp: now(),
}

const SUGGESTIONS = [
  "Como devo priorizar minhas demandas essa semana?",
  "O que olhar antes de fechar o mês no financeiro?",
  "Como organizar o cronograma de um projeto novo?",
  "Dê dicas para reduzir atraso em obras.",
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

// ── Session usage panel ────────────────────────

function SessionUsagePanel({ usage, onReset }: { usage: SessionUsage; onReset: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-secondary/40 border border-border text-[10px] text-muted-foreground">
      <span className="font-medium text-foreground">Uso desta sessão</span>
      <span>{usage.calls} chamada{usage.calls === 1 ? "" : "s"}</span>
      <span className="hidden sm:inline">· entrada {usage.inputTokens} tok</span>
      <span className="hidden sm:inline">· saída {usage.outputTokens} tok</span>
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
  )
}

// ── Page ─────────────────────────────────────

export default function DomusAIPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<SessionUsage>(() => loadUsage())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionIdRef = useRef<string>(getOrCreateSessionId())
  const [, navigate] = useLocation()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  function resetUsage() {
    setUsage(ZERO_USAGE)
    saveUsage(ZERO_USAGE)
  }

  async function sendMessage(text: string) {
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
    setError(null)

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, sessionId: sessionIdRef.current }),
      })

      const body = await res.json().catch(() => null)

      if (!res.ok) {
        const message =
          body && typeof body.error === "string"
            ? body.error
            : "Não foi possível falar com a Domus AI agora. Tente novamente em instantes."
        setError(message)
        return
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: body.message.content,
        timestamp: now(),
      }
      setMessages(prev => [...prev, aiMsg])

      setUsage(prev => {
        const next: SessionUsage = {
          calls: prev.calls + 1,
          inputTokens: prev.inputTokens + (body.usage?.inputTokens ?? 0),
          outputTokens: prev.outputTokens + (body.usage?.outputTokens ?? 0),
          totalTokens: prev.totalTokens + (body.usage?.totalTokens ?? 0),
        }
        saveUsage(next)
        return next
      })
    } catch {
      setError("Não foi possível conectar à Domus AI. Verifique sua conexão e tente novamente.")
    } finally {
      setTyping(false)
    }
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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Triangle className="h-4 w-4 fill-primary text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground leading-tight">Domus AI</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assistente inteligente da Vértice Espaços
              </p>
            </div>
          </div>
          <SessionUsagePanel usage={usage} onReset={resetUsage} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
        {/* Welcome note */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Respostas geradas em tempo real pela OpenAI, no contexto da Vértice Espaços
          </div>
        </div>

        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} onAction={navigate} />
        ))}

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
              maxLength={2000}
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
          MVP acadêmico — a Domus AI usa a API da OpenAI. Navegar pelos outros módulos não consome tokens.
        </p>
      </div>
    </div>
  )
}
