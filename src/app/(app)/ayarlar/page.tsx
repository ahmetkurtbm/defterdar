import { Suspense } from "react";

import { requireUser } from "@/lib/auth/session";
import { getDocumentTypes } from "@/lib/data";

import { DocumentTypes, OfficeForm } from "./settings-forms";

export const metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <h1 className="mb-6 text-2xl font-bold">Ayarlar</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy="true" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const user = await requireUser();
  const types = await getDocumentTypes(user, true);
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="office-title" className="rounded-lg border border-rule bg-card p-4 sm:p-5">
        <h2 id="office-title" className="text-lg font-bold">
          Ofis
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Son teslim günü, dönem yaprağındaki büyük kırmızı rakamdır ve hatırlatma mesajlarında yazar.
        </p>
        <OfficeForm name={user.officeName} collectionDay={user.collectionDay} canEdit={user.role === "owner"} />
      </section>
      <section aria-labelledby="types-title" className="rounded-lg border border-rule bg-card p-4 sm:p-5">
        <h2 id="types-title" className="text-lg font-bold">
          Evrak türleri
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Mükelleflerin yükleme sayfasında ve otomatik sınıflandırmada bu liste kullanılır.</p>
        <DocumentTypes types={types} />
      </section>
    </div>
  );
}
