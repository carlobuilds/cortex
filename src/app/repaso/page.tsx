import type { Metadata } from "next";
import { ReviewPageClient } from "@/components/pages/study-pages";
import { APP_NAME } from "@/lib/app";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: `Repaso · ${APP_NAME}` };

export default function ReviewPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Repaso espaciado (FSRS)" title="Repaso" description="Las tarjetas vencidas, primero las que fallaste con mucha confianza y de fácil a difícil." />
      <ReviewPageClient />
    </div>
  );
}
