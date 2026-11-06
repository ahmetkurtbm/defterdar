import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { BrandMark } from "@/components/shell/brand";
import { formatRelative } from "@/lib/format";
import { daysUntilDue, dueDate, MONTHS, periodLabel } from "@/lib/period";
import { getPortalView, resolvePortalToken } from "@/lib/portal";
import { ACCEPT_ATTRIBUTE } from "@/lib/uploads";
import { cn } from "@/lib/utils";

import { Uploader } from "./uploader";

export const metadata: Metadata = { title: "Evrak gönder", referrer: "no-referrer" };

export default function PortalPage({ params }: PageProps<"/y/[token]">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col text-[1.0625rem]">
      <Suspense fallback={<div className="m-4 h-[28rem] animate-pulse rounded-xl bg-muted" aria-busy="true" />}>
        <Portal params={params} />
      </Suspense>
    </div>
  );
}

async function Portal({ params }: { params: PageProps<"/y/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const ctx = await resolvePortalToken(token);
  if (!ctx) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <BrandMark className="size-10 text-ink" />
        <h1 className="mt-5 text-xl font-bold">Bu link artık çalışmıyor</h1>
        <p className="mt-2 text-muted-foreground">Mali müşavirinizden yeni bir link isteyin.</p>
      </main>
    );
  }

  const view = await getPortalView(ctx);
  const due = dueDate(view.period, view.collectionDay);
  const days = daysUntilDue(view.period, view.collectionDay);
  const remaining = view.checklist.filter((c) => c.count === 0).length;

  return (
    <>
      <header className="bg-cover px-4 pt-5 pb-4 text-cover-foreground">
        <p className="text-sm text-cover-muted">{view.officeName}</p>
        <h1 className="mt-0.5 text-2xl font-bold">{view.contactName ? `Merhaba ${view.contactName}` : view.clientName}</h1>
        {view.contactName ? <p className="text-cover-muted">{view.clientName}</p> : null}
      </header>

      <main className="flex flex-1 flex-col gap-5 px-3 py-4">
        <section className="perforated overflow-hidden rounded-xl border border-rule bg-card" aria-label="Dönem">
          <div className="bg-sunday px-4 pt-4 pb-2 text-center text-base font-bold tracking-wide text-white uppercase [font-stretch:85%]">
            {periodLabel(view.period)} evrakları
          </div>
          <div className="flex items-center gap-4 px-4 py-4">
            <span className="numeral text-[4.5rem] text-sunday" aria-hidden>
              {due.day}
            </span>
            <div>
              <p className="font-semibold">
                Son gün {due.day} {MONTHS[due.month - 1]}
              </p>
              <p className={cn("text-[0.95rem]", days < 0 ? "font-semibold text-sunday" : "text-muted-foreground")}>
                {days > 1 ? `${days} gün kaldı` : days === 1 ? "Yarın son gün" : days === 0 ? "Bugün son gün" : "Süre geçti, yine de gönderebilirsiniz"}
              </p>
              <p className="mt-1 font-semibold">
                {remaining === 0 ? "Beklenen her şey geldi, teşekkürler." : `${remaining} evrak bekleniyor`}
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="list-title">
          <h2 id="list-title" className="mb-2 px-1 text-base font-semibold text-muted-foreground">
            Fotoğrafını çekip gönderin
          </h2>
          <div className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-card">
            {[...view.checklist].sort((a, b) => Number(a.count > 0) - Number(b.count > 0)).map((item) => (
              <Uploader key={item.typeId} token={token} typeId={item.typeId} label={item.name} hint={item.hint} received={item.count} accept={ACCEPT_ATTRIBUTE} />
            ))}
            <Uploader token={token} typeId={null} label="Başka bir belge" hint="Ne olduğunu bilmiyorsanız buradan gönderin" received={0} accept={ACCEPT_ATTRIBUTE} variant="other" />
          </div>
        </section>

        {view.recent.length > 0 ? (
          <section aria-labelledby="recent-title">
            <h2 id="recent-title" className="mb-2 px-1 text-base font-semibold text-muted-foreground">
              Gönderdikleriniz
            </h2>
            <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-card">
              {view.recent.map((doc) => (
                <li key={doc.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{doc.typeName ?? doc.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {doc.typeName ? `${doc.name} · ` : ""}
                        {formatRelative(doc.uploadedAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-sm px-1.5 py-0.5 text-sm font-semibold",
                        doc.status === "accepted" && "bg-done-soft text-done",
                        doc.status === "pending" && "bg-review-soft text-review",
                        doc.status === "rejected" && "bg-sunday-soft text-sunday",
                      )}
                    >
                      {doc.status === "accepted" ? "Alındı" : doc.status === "pending" ? "Kontrol ediliyor" : "Tekrar gönderin"}
                    </span>
                  </div>
                  {doc.status === "rejected" && doc.rejectReason ? <p className="mt-1 text-sm font-medium text-sunday">{doc.rejectReason}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <footer className="px-4 pt-2 pb-6 text-center text-sm text-muted-foreground">
        Belgeleriniz yalnızca mali müşavirinizle paylaşılır.
      </footer>
    </>
  );
}
