import Link from "next/link";
import { Suspense } from "react";

import { PeriodSheet, periodHref } from "@/components/period-sheet";
import { ReminderButton } from "@/components/reminder-button";
import { StatusMark } from "@/components/status";
import { requireUser } from "@/lib/auth/session";
import { getPendingDocuments, getPeriodBoard, statusOf, type BoardStatus } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { comparePeriods, currentPeriod, parsePeriodKey, periodKey, type Period } from "@/lib/period";
import { reminderMessage } from "@/lib/reminder";
import { portalUrl } from "@/lib/urls";

export const metadata = { title: "Bu ay" };

export default function BoardPage({ searchParams }: PageProps<"/pano">) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <Suspense fallback={<BoardSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const URGENCY: Record<BoardStatus, number> = { empty: 0, missing: 1, review: 2, complete: 3 };

async function Board({ searchParams }: { searchParams: PageProps<"/pano">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const current = currentPeriod();
  const requested = parsePeriodKey(typeof params.donem === "string" ? params.donem : null);
  const period: Period = requested && comparePeriods(requested, current) <= 0 ? requested : current;

  const [board, pending] = await Promise.all([getPeriodBoard(user, period), getPendingDocuments(user, 8)]);

  const rows = board
    .map((row) => ({ ...row, status: statusOf(row) }))
    .sort((a, b) => URGENCY[a.status] - URGENCY[b.status] || b.missing.length - a.missing.length || a.name.localeCompare(b.name, "tr"));

  const totals = {
    clients: rows.length,
    complete: rows.filter((r) => r.status === "complete").length,
    review: rows.filter((r) => r.status === "review").length,
    missing: rows.filter((r) => r.status === "missing" || r.status === "empty").length,
  };
  const key = periodKey(period);
  const links = new Map(await Promise.all(rows.map(async (r) => [r.clientId, await portalUrl(r.clientId, r.portalVersion)] as const)));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <PeriodSheet
          period={period}
          collectionDay={user.collectionDay}
          totals={totals}
          hrefFor={periodHref("/pano")}
          isCurrent={comparePeriods(period, current) === 0}
        />

        <section aria-labelledby="board-title" className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <h2 id="board-title" className="text-lg font-bold">
              Mükellefler
            </h2>
            <p className="text-sm text-muted-foreground">Eksiği çok olan üstte</p>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-input bg-card px-6 py-12 text-center">
              <p className="font-semibold">Henüz mükellef yok</p>
              <p className="mt-1 text-sm text-muted-foreground">İlk mükellefinizi ekleyin; size özel bir yükleme linki oluşturalım.</p>
              <Link href="/mukellefler/yeni" className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
                Mükellef ekle
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-rule bg-card">
              <table className="w-full border-collapse text-sm">
                <thead className="sr-only sm:not-sr-only">
                  <tr className="border-b border-rule bg-muted/60 text-left text-xs font-semibold text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Mükellef</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">Eksik evrak</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Durum</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-semibold whitespace-nowrap lg:table-cell">Son yükleme</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold"><span className="sr-only">İşlem</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.clientId} className="border-b border-rule last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 align-top">
                        <Link href={`/mukellefler/${row.clientId}?donem=${key}`} className="font-semibold hover:underline">
                          {row.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground md:hidden">
                          {row.missing.length > 0 ? row.missing.map((m) => m.name).join(", ") : `${row.accepted + row.pending}/${row.required} evrak`}
                        </p>
                      </td>
                      <td className="hidden px-3 py-3 align-top md:table-cell">
                        {row.missing.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <ul className="flex flex-wrap gap-1">
                            {row.missing.map((m) => (
                              <li key={m.id} className="rounded-sm border border-sunday/25 px-1.5 py-px text-xs text-sunday">
                                {m.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <StatusMark status={row.status} />
                      </td>
                      <td className="hidden px-3 py-3 align-top whitespace-nowrap text-muted-foreground lg:table-cell">
                        {row.lastUploadAt ? formatRelative(row.lastUploadAt) : "—"}
                        {row.lastReminderAt ? (
                          <p className="text-xs">Hatırlatıldı: {formatRelative(row.lastReminderAt)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {row.status === "missing" || row.status === "empty" ? (
                          <ReminderButton
                            clientId={row.clientId}
                            periodKey={key}
                            phone={row.phone}
                            message={reminderMessage({
                              contactName: row.contactName,
                              officeName: user.officeName,
                              period,
                              collectionDay: user.collectionDay,
                              missing: row.missing.map((m) => m.name),
                              link: links.get(row.clientId)!,
                            })}
                          />
                        ) : row.status === "review" ? (
                          <Link href="/evraklar" className="text-sm font-semibold text-review hover:underline">
                            İncele
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <aside aria-labelledby="inbox-title" className="min-w-0">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="inbox-title" className="text-lg font-bold">
            Onay bekleyen
          </h2>
          <Link href="/evraklar" className="text-sm font-semibold text-primary hover:underline">
            Tümü
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-rule bg-card px-4 py-6 text-sm text-muted-foreground">Bekleyen belge yok. Gelenler burada görünür.</p>
        ) : (
          <ol className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
            {pending.map((doc) => (
              <li key={doc.id}>
                <Link href={`/evraklar#${doc.id}`} className="block px-4 py-3 transition-colors hover:bg-muted/40">
                  <p className="truncate text-sm font-semibold">{doc.clientName}</p>
                  <p className="truncate text-sm">{doc.typeName ?? "Türü belirlenmedi"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatRelative(doc.uploadedAt)}</p>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]" aria-busy="true" aria-label="Yükleniyor">
      <div className="flex flex-col gap-6">
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
