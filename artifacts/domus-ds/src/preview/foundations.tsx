import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Guidelines } from './parts';

/* ── Paleta primitiva Domus ─────────────────────────────── */
const INK_SWATCHES = [
  { name: 'ink-950', hex: '#05070D' },
  { name: 'ink-900', hex: '#080B14' },
  { name: 'ink-850', hex: '#0C101B' },
  { name: 'ink-800', hex: '#111624' },
  { name: 'ink-750', hex: '#171D2E' },
  { name: 'ink-700', hex: '#1E2639' },
  { name: 'ink-650', hex: '#273049' },
  { name: 'ink-600', hex: '#323D5A' },
  { name: 'ink-500', hex: '#4C5A7B' },
  { name: 'ink-400', hex: '#6B7A9C' },
  { name: 'ink-300', hex: '#9EAAC6' },
  { name: 'ink-200', hex: '#CBD3E3' },
  { name: 'ink-100', hex: '#E3E8F1' },
  { name: 'ink-50',  hex: '#F1F4F9' },
  { name: 'ink-0',   hex: '#FBFCFE' },
];

const AZUL_SWATCHES = [
  { name: 'azul-900', hex: '#031038' },
  { name: 'azul-700', hex: '#0A2F80' },
  { name: 'azul-600', hex: '#0E40AB' },
  { name: 'azul-500', hex: '#1452D6' },
  { name: 'azul-400', hex: '#2E70EF' },
  { name: 'azul-300', hex: '#5A93FF' },
  { name: 'azul-200', hex: '#8FB6FF' },
  { name: 'azul-100', hex: '#C4D9FF' },
];

const CIANO_SWATCHES = [
  { name: 'ciano-600', hex: '#0E7F92' },
  { name: 'ciano-500', hex: '#17A8BE' },
  { name: 'ciano-400', hex: '#2BD0E4' },
  { name: 'ciano-300', hex: '#6FE7F5' },
];

const STATE_SWATCHES = [
  { name: 'sucesso',   hex: '#3FCE87' },
  { name: 'atenção',  hex: '#F0B23C' },
  { name: 'erro',      hex: '#FF6E63' },
  { name: 'info',      hex: '#5A93FF' },
];

const AREA_SWATCHES = [
  { name: 'Estrutura',  hex: '#9DA4B0' },
  { name: 'Portfólio', hex: '#DCE3F0' },
  { name: 'Sistema',   hex: '#A78FF5' },
  { name: 'Jurídico',  hex: '#D889D6' },
  { name: 'Operações', hex: '#4FC3D9' },
  { name: 'Financeiro',hex: '#5FC3AE' },
  { name: 'Empresa',   hex: '#9ECB74' },
  { name: 'Comercial', hex: '#CFC46F' },
  { name: 'Mercado',   hex: '#F09359' },
  { name: 'Marketing', hex: '#F27B9C' },
];

const SEMANTIC_SWATCHES = [
  { name: 'primary',     className: 'bg-primary' },
  { name: 'secondary',   className: 'bg-secondary border border-border' },
  { name: 'accent',      className: 'bg-accent' },
  { name: 'muted',       className: 'bg-muted border border-border' },
  { name: 'destructive', className: 'bg-destructive' },
  { name: 'border',      className: 'bg-border' },
];

const DOMUS_TYPE_SCALE = [
  { label: 'D1 — Abertura', size: '44px', className: 'text-5xl font-bold tracking-tight leading-none' },
  { label: 'D2 — Título de página', size: '32px', className: 'text-4xl font-semibold tracking-tight' },
  { label: 'T1 — Seção', size: '24px', className: 'text-2xl font-semibold tracking-tight' },
  { label: 'T2 — Cartão', size: '20px', className: 'text-xl font-semibold' },
  { label: 'T3 — Subtítulo', size: '17px', className: 'text-[17px] font-medium' },
  { label: 'Corpo', size: '14px', className: 'text-sm' },
  { label: 'Apoio', size: '12px', className: 'text-xs text-muted-foreground' },
  { label: 'Etiqueta', size: '11px', className: 'text-[11px] font-medium uppercase tracking-[0.06em]' },
];

const SPACING_SCALE = [
  { label: 'e1 — 4px',  px: 4 },
  { label: 'e2 — 8px',  px: 8 },
  { label: 'e3 — 12px', px: 12 },
  { label: 'e4 — 16px', px: 16 },
  { label: 'e5 — 20px', px: 20 },
  { label: 'e6 — 24px', px: 24 },
  { label: 'e7 — 32px', px: 32 },
  { label: 'e8 — 40px', px: 40 },
  { label: 'e9 — 56px', px: 56 },
];

/* ── Helpers ─────────────────────────────────────────────── */
function HexSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <div
        className="h-10 rounded-md border border-border/40"
        style={{ background: hex }}
      />
      <p className="text-[11px] font-mono text-muted-foreground truncate">{name}</p>
      <p className="text-[10px] font-mono text-muted-foreground/70 truncate">{hex}</p>
    </div>
  );
}

function SemanticSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="space-y-1.5">
      <div className={`h-10 rounded-md ${className}`} />
      <p className="text-[11px] font-mono text-muted-foreground">{name}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
      {children}
    </h2>
  );
}

/* ── Pages ───────────────────────────────────────────────── */
export function OverviewPage() {
  return (
    <div className="space-y-4">
      {/* Paleta semântica */}
      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <SectionTitle>Paleta semântica</SectionTitle>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {SEMANTIC_SWATCHES.map((s) => (
            <SemanticSwatch key={s.name} {...s} />
          ))}
        </div>
      </section>

      {/* Tipografia + Em uso */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <SectionTitle>Tipografia</SectionTitle>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Inter — interface</p>
              <p className="text-2xl font-semibold tracking-tight">O sistema é a estrutura.</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-mono">IBM Plex Mono — dados</p>
              <p className="font-mono text-sm text-accent">R$ 128.400,00</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <SectionTitle>Em uso</SectionTitle>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Nova demanda</CardTitle>
              <CardDescription>
                Componentes compostos a partir dos tokens do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ov-name">Título</Label>
                <Input id="ov-name" placeholder="Ex.: Fechar contrato XPTO" />
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked id="ov-notify" />
                <Label htmlFor="ov-notify">Notificação por e-mail</Label>
                <Badge className="ml-auto">Novo</Badge>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button>Salvar</Button>
              <Button variant="outline">Cancelar</Button>
            </CardFooter>
          </Card>
        </section>
      </div>

      {/* Componentes */}
      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <SectionTitle>Componentes</SectionTitle>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secundário</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Erro</Badge>
        </div>
      </section>

      {/* Luz da marca */}
      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <SectionTitle>Luz da marca — ciano</SectionTitle>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {CIANO_SWATCHES.map((s) => (
            <HexSwatch key={s.name} {...s} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function ColorsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      {/* Papéis semânticos */}
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Papéis semânticos</h2>
          <p className="text-sm text-muted-foreground">
            São os únicos tokens que os componentes podem usar. Todo papel existe em tema escuro e claro.
          </p>
        </div>
        <Guidelines
          items={[
            { kind: 'do', text: 'Use sempre o papel semântico (ex.: var(--primary)), nunca o primitivo (var(--azul-500)) em componentes.' },
            { kind: 'do', text: 'Toda troca de tema acontece nos papéis semânticos; os primitivos são constantes.' },
            { kind: 'do', text: 'Foregrounds devem ser legíveis sobre a superfície pareada (mínimo WCAG AA).' },
            { kind: 'dont', text: 'Não use primitivos como --ink-700 diretamente num componente — ele perde o tema claro.' },
            { kind: 'dont', text: 'Não invente novos papéis; mapeie sobre os existentes.' },
          ]}
        />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {SEMANTIC_SWATCHES.map((s) => (
            <SemanticSwatch key={s.name} {...s} />
          ))}
        </div>
      </section>

      {/* Paleta ink */}
      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="font-semibold">Paleta ink — a tinta crua</h2>
          <p className="text-sm text-muted-foreground">
            Azuis-escuros da noite. Nunca usados diretamente em componentes.
          </p>
        </div>
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-8 lg:grid-cols-15">
          {INK_SWATCHES.map((s) => (
            <HexSwatch key={s.name} {...s} />
          ))}
        </div>
      </section>

      {/* Paleta azul */}
      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="font-semibold">Azul de ação</h2>
          <p className="text-sm text-muted-foreground">
            azul-500 (#1452D6) no tema escuro, azul-600 (#0E40AB) no claro. Tudo que se clica, foca ou arrasta.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {AZUL_SWATCHES.map((s) => (
            <HexSwatch key={s.name} {...s} />
          ))}
        </div>
      </section>

      {/* Paleta ciano */}
      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="font-semibold">Ciano — a luz da marca</h2>
          <p className="text-sm text-muted-foreground">
            Destaque que separa o Domus de um azul genérico.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-4">
          {CIANO_SWATCHES.map((s) => (
            <HexSwatch key={s.name} {...s} />
          ))}
        </div>
      </section>

      {/* Estados */}
      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="font-semibold">Estados</h2>
          <p className="text-sm text-muted-foreground">
            Quatro, fixos, iguais em toda área. As tintas abaixo são para o tema escuro.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {STATE_SWATCHES.map((s) => (
            <HexSwatch key={s.name} {...s} />
          ))}
        </div>
      </section>

      {/* Áreas de negócio */}
      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="font-semibold">Dez áreas de negócio</h2>
          <p className="text-sm text-muted-foreground">
            Cada área tem um par campo/tinta. As tintas abaixo são para badges e rótulos no tema escuro.
          </p>
        </div>
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
          {AREA_SWATCHES.map((s) => (
            <HexSwatch key={s.name} {...s} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function FontsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      {/* Inter */}
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Inter — tipografia de interface</h2>
          <p className="text-sm text-muted-foreground">
            Para todo texto de UI: títulos, corpo, rótulos, legendas.
          </p>
        </div>
        <div className="space-y-3">
          {DOMUS_TYPE_SCALE.map((entry) => (
            <div key={entry.label} className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <span className="pt-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {entry.label}
                <span className="ml-1 font-mono normal-case tracking-normal opacity-60">{entry.size}</span>
              </span>
              <p className={entry.className}>Domus — a casa dos fundadores.</p>
            </div>
          ))}
        </div>
      </section>

      {/* IBM Plex Mono */}
      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="font-semibold">IBM Plex Mono — dados e código</h2>
          <p className="text-sm text-muted-foreground">
            Para números, IDs, valores financeiros e código. Peso padrão 400; use 500 para destaque.
          </p>
        </div>
        <div className="space-y-3">
          <p className="font-mono text-2xl text-accent">R$ 1.284.000,00</p>
          <p className="font-mono text-sm text-muted-foreground">DOC-2026-08-4412</p>
          <p className="font-mono text-xs text-muted-foreground/60">POST /api/financial/transactions</p>
        </div>
        <Guidelines
          items={[
            { kind: 'do', text: 'Use IBM Plex Mono para qualquer número financeiro, ID de documento ou trecho de código.' },
            { kind: 'do', text: 'Alterne para o peso 500 quando precisar destacar um valor sem mudar a cor.' },
            { kind: 'dont', text: 'Não misture Inter e IBM Plex Mono na mesma linha de texto corrido.' },
          ]}
        />
      </section>
    </div>
  );
}

export function LayoutPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Espaçamento */}
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Espaçamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Múltiplos de 4px (e1–e10). Números fora dessa lista são chute.
        </p>
        <div className="mt-6 space-y-3">
          {SPACING_SCALE.map((space) => (
            <div key={space.label} className="flex items-center gap-4">
              <span className="w-24 shrink-0 text-[11px] font-mono text-muted-foreground">{space.label}</span>
              <div
                className="h-3 rounded-full bg-primary"
                style={{ width: space.px }}
              />
            </div>
          ))}
        </div>
        <Guidelines
          items={[
            { kind: 'do', text: 'Mantenha todos os espaços em múltiplos de 4px.' },
            { kind: 'dont', text: 'Não use valores como 5px, 7px ou 11px — não pertencem à escala.' },
          ]}
        />
      </section>

      {/* Raios e medidas de sistema */}
      <section className="rounded-xl border bg-card p-6 text-card-foreground space-y-6">
        <div>
          <h2 className="font-semibold">Raios de canto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cresce com a superfície: chip pequeno com raio grande vira comprimido.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[
              { label: 'xs — 4px',    style: { borderRadius: '4px' } },
              { label: 's — 6px',     style: { borderRadius: '6px' } },
              { label: 'm — 10px',    style: { borderRadius: '10px' } },
              { label: 'g — 16px',    style: { borderRadius: '16px' } },
            ].map((r) => (
              <div
                key={r.label}
                className="flex h-20 items-end border bg-muted p-3"
                style={r.style}
              >
                <span className="text-xs font-mono text-muted-foreground">{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold">Medidas fixas do sistema</h2>
          <div className="mt-3 space-y-2 font-mono text-sm">
            {[
              { name: '--alt-controle', value: '34px', desc: 'botão, campo, select' },
              { name: '--alt-linha',    value: '38px', desc: 'linha de tabela/lista' },
              { name: '--alt-topo',     value: '52px', desc: 'barra de topo' },
              { name: '--larg-menu',    value: '224px', desc: 'largura do menu lateral' },
              { name: '--alvo-toque',   value: '44px', desc: 'área mínima clicável' },
            ].map((m) => (
              <div key={m.name} className="flex gap-3 items-baseline">
                <span className="text-accent text-[11px]">{m.name}</span>
                <span className="text-xs text-foreground">{m.value}</span>
                <span className="text-[11px] text-muted-foreground">— {m.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
