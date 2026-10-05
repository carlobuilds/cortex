import type { Metadata } from "next";
import { StudyFrame } from "@/components/layout/study-frame";
import { SessionPageClient } from "@/components/pages/study-pages";
import { CONFIG } from "@/engine/config";
import { APP_NAME } from "@/lib/app";

export const metadata: Metadata = { title: `Sesión de hoy · ${APP_NAME}` };

export default function SessionPage() {
  return (
    <StudyFrame crumbs={[{ label: "Hoy", href: "/" }, { label: "Sesión de hoy" }]} exitHref="/" exitLabel="Al inicio">
      <div className="max-w-3xl">
        <header className="mb-8">
          <p className="eyebrow">
            {CONFIG.dailyMinutes.min}–{CONFIG.dailyMinutes.max} min · parar después nunca tiene castigo
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Sesión de hoy</h1>
        </header>
        <SessionPageClient />
      </div>
    </StudyFrame>
  );
}
