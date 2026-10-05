import type { Metadata } from "next";
import { ProgressClient } from "@/components/pages/insight-pages";
import { APP_NAME } from "@/lib/app";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: `Progreso · ${APP_NAME}` };

export default function ProgressPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="Compites contra ti" title="Progreso" />
      <ProgressClient />
    </div>
  );
}
