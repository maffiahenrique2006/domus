import { Triangle } from "lucide-react"

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.66Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-3a7.4 7.4 0 0 1-4.07 1.16c-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.28a12 12 0 0 0 0 10.8l3.99-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.94 1.19 15.23 0 12 0 7.31 0 3.26 2.69 1.28 6.6l3.99 3.1c.95-2.85 3.6-4.95 6.73-4.95Z"
      />
    </svg>
  )
}

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground dark px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Triangle className="h-6 w-6 fill-primary text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Domus System</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Vértice Espaços</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Entre com sua conta Google para acessar demandas, projetos, financeiro e a Domus AI.
        </p>

        <a
          href="/api/auth/google"
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-secondary transition-colors"
        >
          <GoogleIcon />
          Entrar com Google
        </a>

        <p className="text-[11px] text-muted-foreground/70">
          MVP acadêmico — não é a Domus oficial.
        </p>
      </div>
    </div>
  )
}
