import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { MonthStrip } from "@/components/month-strip";
import { StatusMark } from "@/components/status";
import { requireUser } from "@/lib/auth/session";
import { CLIENT_KIND_LABELS, getClientPeriodStrip, getPeriodBoard, statusOf } from "@/lib/data";
import { formatPhone } from "@/lib/phone";
import { currentPeriod } from "@/lib/period";

export const metadata = { title: "Mükellefler" };

export default function ClientsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mükellefler</h1>
          <p className="mt-1 text-muted-foreground">Son 12 dönemde kim ne zaman tamamladı.</p>
        </div>
        <Link href="/mukellefler/yeni" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="size-4" aria-hidden />
          Mükellef ekle
        </Link>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy="true" />}>
        <ClientList />
      </Suspense>
    </div>
  );
}

async function ClientList() {
  const user = await requireUser();
  const period = currentPeriod();
  const board = await getPeriodBoard(user, period);
  const strips = await Promise.all(board.map((c) => getClientPeriodStrip(user, c.clientId, period, 12)));

  if (board.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
        <p className="font-semibold">Henüz mükellef yok</p>
        <p className="mt-1 text-sm text-muted-foreground">Mükellef ekledikçe 12 aylık geçmişleri burada görünür.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-card">
      {board.map((c, i) => (
        <li key={c.clientId} className="grid items-center gap-x-6 gap-y-2 px-4 py-3.5 sm:px-5 md:grid-cols-[minmax(0,1.2fr)_auto_auto]">
          <div className="min-w-0">
            <Link href={`/mukellefler/${c.clientId}`} className="font-semibold hover:underline">
              {c.name}
            </Link>
            <p className="truncate text-sm text-muted-foreground">
              {CLIENT_KIND_LABELS[c.kind]}
              {c.contactName ? ` · ${c.contactName}` : ""}
              {c.phone ? ` · ${formatPhone(c.phone)}` : ""}
            </p>
          </div>
          <MonthStrip strip={strips[i]} clientId={c.clientId} />
          <div className="md:w-32 md:text-right">
            <StatusMark status={statusOf(c)} />
          </div>
        </li>
      ))}
    </ul>
  );
}
