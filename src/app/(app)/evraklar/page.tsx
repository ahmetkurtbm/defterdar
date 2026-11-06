import { Suspense } from "react";

import { DocumentReview } from "@/components/document-review";
import { requireUser } from "@/lib/auth/session";
import { getDocumentTypes, getPendingDocuments } from "@/lib/data";

export const metadata = { title: "Gelen evrak" };

export default function InboxPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <h1 className="text-2xl font-bold">Gelen evrak</h1>
      <p className="mt-1 mb-5 text-muted-foreground">
        Mükelleflerin yüklediği belgeler. Tür otomatik önerilir; onayladığınızda belge döneme işlenir.
      </p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy="true" />}>
        <Inbox />
      </Suspense>
    </div>
  );
}

async function Inbox() {
  const user = await requireUser();
  const [docs, types] = await Promise.all([getPendingDocuments(user, 200), getDocumentTypes(user)]);

  if (docs.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-card px-6 py-14 text-center">
        <p className="numeral text-6xl text-done">0</p>
        <p className="mt-3 font-semibold">Onay bekleyen belge yok</p>
        <p className="mt-1 text-sm text-muted-foreground">Mükellefler yükledikçe belgeler burada sıraya girer.</p>
      </div>
    );
  }

  return (
    <section aria-label={`${docs.length} belge onay bekliyor`} className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
      {docs.map((doc) => (
        <DocumentReview key={doc.id} doc={doc} types={types} />
      ))}
    </section>
  );
}
