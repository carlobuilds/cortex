import { Flame, Inbox, Layers, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HudBar } from "@/components/hud/hud-bar";
import { LifeBar } from "@/components/hud/life-bar";
import { Lives } from "@/components/hud/lives";
import { StreakChip } from "@/components/hud/streak-chip";
import { XpBar } from "@/components/hud/xp-bar";
import { PageHeader } from "@/components/layout/page-header";
import { InlineMarkdown } from "@/components/lessons/inline-markdown";
import { ConceptBox, FadedExample, Pitfall, PredictPrompt, VisualBlock } from "@/components/lessons/lesson-blocks";
import { FormulaDemo } from "@/components/study/formula-demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Kbd, LoadingState, StatTile } from "@/components/ui/state";
import { Switch } from "@/components/ui/switch";
import { APP_NAME } from "@/lib/app";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: `Sistema visual · ${APP_NAME}` };

const SWATCHES = [
  ["bg", "fondo"],
  ["surface", "superficie"],
  ["surface-2", "superficie 2"],
  ["surface-3", "superficie 3"],
  ["border-strong", "borde fuerte"],
  ["ink", "tinta"],
  ["ink-2", "tinta 2"],
  ["muted", "apagado"],
  ["brand", "acento (violeta)"],
  ["brand-soft", "seleccionado"],
  ["success", "correcto"],
  ["xp", "XP"],
  ["streak", "racha"],
  ["life", "vida / jefe"],
  ["warning", "aviso"],
  ["info", "info"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-14 first:mt-0">
      <h2 id={id} className="mb-4 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatches() {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SWATCHES.map(([token, label]) => (
        <li key={token} className="overflow-hidden rounded-md border bg-surface">
          <div className="h-10 border-b" style={{ background: `var(--${token})` }} />
          <div className="px-2.5 py-1.5">
            <p className="text-caption font-medium">{label}</p>
            <p className="font-mono text-caption text-muted-foreground">--{token}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Controls() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="cta">Empezar sesión de hoy</Button>
      <Button>
        Comprobar <Kbd className="border-current/40 text-current">⏎</Kbd>
      </Button>
      <Button variant="secondary">Secundario</Button>
      <Button variant="outline">Contorno</Button>
      <Button variant="ghost">Fantasma</Button>
      <Button variant="destructive">Reemplazar datos</Button>
      <Button disabled>Deshabilitado</Button>
      <Badge>Backlog</Badge>
      <Badge variant="brand">Practicada</Badge>
      <Badge variant="success">Correcto</Badge>
      <Badge variant="xp">+25 XP</Badge>
      <Badge variant="streak">Racha 4</Badge>
      <Badge variant="outline">Fase 3</Badge>
      <label className="flex items-center gap-2 text-sm">
        <Switch aria-label="Sonido (muestra)" /> Sonido
      </label>
    </div>
  );
}

/** Un tema completo en miniatura: los tokens cambian por clase, sin variantes `dark:`. */
function ThemePanel({ theme, title }: { theme: "theme-dark" | "theme-light"; title: string }) {
  return (
    <div className={cn(theme, "grid gap-5 rounded-xl border bg-background p-4 text-foreground sm:p-5")}>
      <p className="text-sm font-semibold">{title}</p>
      <Swatches />
      <Controls />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="raised rounded-lg border bg-surface p-3 text-caption">raised</div>
        <div className="glow rounded-lg border bg-surface p-3 text-caption">glow</div>
        <div className="glow glow-xp rounded-lg border bg-surface p-3 text-caption">glow-xp</div>
      </div>
    </div>
  );
}

export default function StylePage() {
  return (
    <div>
      <PageHeader
        eyebrow="ADR-020 · catálogo vivo"
        title="Sistema visual"
        description="«Arcano»: 90 % consola pro para leer y decidir, 10 % juego premium en lo que se gana o se vive. Contraste AA en ambos temas (lo revisa src/styles/tokens.test.ts); todo movimiento se apaga con «reducir movimiento» y en claro no hay glow."
      />

      <Section id="tokens" title="Tokens · oscuro y claro">
        <div className="grid gap-4 xl:grid-cols-2">
          <ThemePanel theme="theme-dark" title="Tema oscuro" />
          <ThemePanel theme="theme-light" title="Tema claro" />
        </div>
      </Section>

      <Section id="tipografia" title="Tipografía · Geist Sans + Geist Mono">
        <div className="grid gap-5">
          <p className="font-mono text-6xl font-semibold tracking-tight tabular-nums">
            1,240<span className="ml-2 align-top text-base text-xp-text">XP</span>
          </p>
          <p className="text-4xl font-extrabold tracking-[-0.03em]">Título de página (h1)</p>
          <p className="text-lg font-semibold">Título de sección (h2)</p>
          <p className="lesson-prose">Texto de lección: 17 px con interlineado amplio y líneas de ~68 caracteres, una sección a la vez.</p>
          <p className="text-sm text-ink-2">Texto secundario y ayudas (14 px).</p>
          <p className="text-label">Etiqueta (13 px) · text-label</p>
          <p className="text-caption text-muted-foreground">Nota pequeña (12 px, el mínimo) · text-caption</p>
          <p className="eyebrow">Etiqueta sobre un título · eyebrow</p>
        </div>
      </Section>

      <Section id="forma" title="Radios · chip 6 · control 8 · panel 12 · hero 16">
        <div className="flex flex-wrap gap-3">
          {(["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl"] as const).map((r) => (
            <div key={r} className={cn(r, "raised grid size-20 place-items-center border bg-surface font-mono text-caption")}>
              {r.replace("rounded-", "")}
            </div>
          ))}
        </div>
      </Section>

      <Section id="estados" title="Estados · carga, vacío y cifras">
        <div className="grid gap-4 lg:grid-cols-3">
          <LoadingState label="Cargando (muestra)…" rows={3} />
          <EmptyState icon={Inbox} title="Aún no hay nada aquí." description="Un estado vacío dice qué es, por qué está vacío y qué hacer." action={<Button size="sm">Hacer algo</Button>} />
          <div className="grid gap-3">
            <StatTile label="Racha" tone="streak" icon={Flame} value="4 días" hint="+1 hoy" />
            <StatTile label="XP de hoy" tone="xp" icon={Sparkles} value={184} />
            <StatTile label="Repasos pendientes" icon={Layers} value={12} />
          </div>
        </div>
      </Section>

      <Section id="hud" title="HUD · estados límite">
        <div className="grid gap-4">
          {(
            [
              ["Cargando", null],
              ["Recién creado", { xpTotal: 0, level: 1, currentStreak: 0, levelProgress: 0 }],
              ["A media semana", { xpTotal: 1240, level: 5, currentStreak: 4, levelProgress: 0.45 }],
              ["Nivel casi lleno", { xpTotal: 98_760, level: 38, currentStreak: 120, levelProgress: 0.97 }],
            ] as const
          ).map(([label, data]) => (
            <div key={label} className="flex flex-wrap items-center gap-6 rounded-lg border bg-surface px-4 py-3">
              <span className="w-36 text-sm text-ink-2">{label}</span>
              <HudBar data={data} />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-6 rounded-lg border bg-surface px-4 py-3">
            <span className="w-36 text-sm text-ink-2">Piezas sueltas</span>
            <XpBar progress={0.62} className="h-2" />
            <StreakChip days={1} />
            <Lives current={2} max={3} />
            <LifeBar current={2} max={3} className="w-40" />
          </div>
        </div>
      </Section>

      <Section id="tarjetas" title="Tarjetas">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Panel</CardTitle>
              <CardDescription>Para leer y decidir: borde de 1 px y capa elevada.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-ink-2">El contenido respira; el acento aparece poco y con intención.</CardContent>
          </Card>
          <Card className="glow glow-life border-life/40">
            <CardHeader>
              <CardTitle>Momento de juego</CardTitle>
              <CardDescription>Solo en lo que se gana o se vive: jefe, cofre, nivel, CTA.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-ink-2">El glow es estático y en el tema claro no existe.</CardContent>
          </Card>
        </div>
      </Section>

      <Section id="bloques" title="Bloques de lección">
        <div className="lesson-prose">
          <PredictPrompt pregunta="¿A qué número se acerca $\dfrac{x^2-9}{x-3}$ cuando $x \to 3$?" revela="A 6: factoriza y cancela." />
          <ConceptBox titulo="Límite">
            <InlineMarkdown text="Lo que importa es lo que pasa **cerca** de $a$, no **en** $a$." />
          </ConceptBox>
          <FadedExample titulo="Racionalizar" pasos={["Multiplica por el conjugado.", "El numerador queda ___ ."]} respuestas={["x-1"]} />
          <Pitfall>
            <InlineMarkdown text="$0/0$ no es un número: es una señal de que hay que trabajar más." />
          </Pitfall>
        </div>
      </Section>

      <Section id="visuales" title="Visuales de lección · en ambos temas">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="theme-dark lesson-prose rounded-xl border bg-background p-4 text-foreground sm:p-5">
            <VisualBlock id="limite" f="(x^2-1)/(x-1)" a="1" dominio="-2, 4" />
            <VisualBlock id="secante-tangente" f="x^2" a="1" dominio="-1, 3.5" />
          </div>
          <div className="theme-light lesson-prose rounded-xl border bg-background p-4 text-foreground sm:p-5">
            <VisualBlock id="riemann" f="x^2" dominio="0, 2" n="4" />
            <VisualBlock id="grafica" f="floor(x)" dominio="-2.5, 3.5" titulo="Una función con saltos" />
          </div>
        </div>
        <div className="lesson-prose">
          <VisualBlock id="grafica" f="1/x" dominio="-3, 3" rango="-6, 6" titulo="Una asíntota vertical" />
        </div>
      </Section>

      <Section id="formulas" title="Entrada de fórmulas (MathLive) y verificador simbólico">
        <FormulaDemo />
      </Section>
    </div>
  );
}
