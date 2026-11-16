import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BackupPanel } from "@/components/settings/backup-panel";
import { InputModeSetting } from "@/components/settings/input-mode-setting";
import { SoundToggle } from "@/components/settings/sound-toggle";
import { ChestOddsTable, ReportsPanel, StudyPreferences } from "@/components/settings/study-settings";
import { OfflineStatus } from "@/components/pwa/offline-status";
import { StorageStatus } from "@/components/settings/storage-status";
import { APP_NAME } from "@/lib/app";
import { PageHeader } from "@/components/layout/page-header";
import { CuartelPanel } from "@/components/settings/cuartel-panel";

export const metadata: Metadata = { title: `Ajustes · ${APP_NAME}` };

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border bg-surface p-5 sm:p-6">
      <h2 id={id} className="eyebrow mb-5">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Local-first" title="Ajustes" description="Tus datos viven solo en este navegador. Desde aquí los cuidas." />
      <div className="grid gap-6">
        <Panel id="preferencias" title="Preferencias">
          <div className="grid gap-6">
            <SoundToggle />
            <InputModeSetting />
            <StudyPreferences />
          </div>
        </Panel>
        <Panel id="cofre" title="Probabilidades del cofre">
          <ChestOddsTable />
        </Panel>
        <Panel id="reportes" title="Reportes de contenido">
          <ReportsPanel />
        </Panel>
        <Panel id="datos" title="Tus datos">
          <div className="grid gap-6">
            <StorageStatus />
            <OfflineStatus />
            <div className="border-t pt-6">
              <BackupPanel />
            </div>
          </div>
        </Panel>
        {process.env.NEXT_PUBLIC_CORTEX_PWA !== "1" ? (
          <Panel id="cuartel" title="Cuartel">
            <CuartelPanel />
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
