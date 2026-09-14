import { useEffect, useState } from "react"
import { useSearch, useLocation } from "wouter"
import { Sparkles, Check } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export default function AccountPage() {
  const { user, refresh } = useAuth()
  const search = useSearch()
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(search)
    const checkout = params.get("checkout")
    if (checkout === "success") {
      toast({ title: "Assinatura confirmada", description: "Seu Plano Pro está ativo." })
      refresh()
      navigate("/conta", { replace: true })
    } else if (checkout === "cancelled") {
      toast({ title: "Checkout cancelado", description: "Nenhuma cobrança foi feita." })
      navigate("/conta", { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function handleSubscribe() {
    setCheckingOut(true)
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", credentials: "include" })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.url) {
        toast({
          title: "Não foi possível iniciar o checkout",
          description: body?.error ?? "Tente novamente em instantes.",
          variant: "destructive",
        })
        return
      }
      window.location.href = body.url
    } catch {
      toast({
        title: "Não foi possível conectar ao Stripe",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setCheckingOut(false)
    }
  }

  if (!user) return null

  const isPro = user.plan === "pro"

  return (
    <div className="h-full overflow-y-auto px-4 md:px-8 py-6">
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Minha conta</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dados da sua sessão e assinatura do Domus System.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          {user.pictureUrl ? (
            <img src={user.pictureUrl} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Plano</h2>
            </div>
            <span
              className={
                isPro
                  ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                  : "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground border border-border"
              }
            >
              {isPro ? "Pro" : "Free"}
            </span>
          </div>

          {isPro ? (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p>Sua assinatura do Plano Pro está ativa (modo de teste do Stripe).</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Assine o Plano Pro para desbloquear a demonstração completa. Checkout real do Stripe,
                em modo de teste — nenhuma cobrança real é feita.
              </p>
              <button
                onClick={handleSubscribe}
                disabled={checkingOut}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {checkingOut ? "Abrindo checkout…" : "Assinar Plano Pro"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
