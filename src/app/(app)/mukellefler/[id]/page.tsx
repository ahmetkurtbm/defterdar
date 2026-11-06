import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ClientForm } from "@/components/client-form";
import { DocumentReview } from "@/components/document-review";
import { MonthStrip } from "@/components/month-strip";
import { PeriodCloseButton } from "@/components/period-close-button";
import { PortalLinkCard } from "@/components/portal-link-card";
import { ReminderButton } from "@/components/reminder-button";
import { RequirementsEditor } from "@/components/requirements-editor";
import { StatusMark } from "@/components/status";
import { updateClient } from "@/lib/actions/office";
import { requireUser } from "@/lib/auth/session";
import { CLIENT_KIND_LABELS, getClient, getClientDocuments, getClientPeriodStrip, getDocumentTypes, getPeriodBoard, statusOf } from "@/lib/data";
import { formatPhone } from "@/lib/phone";
import { comparePeriods, currentPeriod, parsePeriodKey, periodKey, periodLabel } from "@/lib/period";
import { reminderMessage } from "@/lib/reminder";
import { portalUrl } from "@/lib/urls";

export default function ClientPage({ params, searchParams }: PageProps<"/mukellefler/[id]">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <Link href="/mukellefler" className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        Mükellefler
      </Link>
      <Suspense fallback={<div className="mt-4 h-[32rem] animate-pulse rounded-lg bg-muted" aria-busy="true" />}>
        <ClientDetailView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ClientDetailView({
  params,
  searchParams,
}: {
  params: PageProps<"/mukellefler/[id]">["params"];
  searchParams: PageProps<"/mukellefler/[id]">["searchParams"];
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const client = await getClient(user, id);
  if (!client) notFound();

  const current = currentPeriod();
  const requested = parsePeriodKey(typeof query.donem === "string" ? query.donem : null);
  const period = requested && comparePeriods(requested, current) <= 0 ? requested : current;
  const key = periodKey(period);

  const [types, docs, strip, board, link] = await Promise.all([
    getDocumentTypes(user),
    getClientDocuments(user, client.id, period),
    getClientPeriodStrip(user, client.id, current, 12),
    getPeriodBoard(user, period),
    portalUrl(client.id, client.portalVersion),
  ]);
  const row = board.find((r) => r.clientId === client.id)!;
  const status = statusOf(row);
  const boundUpdate = updateClient.bind(null, client.id);

  return (
    <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {CLIENT_KIND_LABELS[client.kind]}
            {client.taxId ? ` · ${client.taxId}` : ""}
            {client.contactName ? ` · ${client.contactName}` : ""}
            {client.phone ? ` · ${formatPhone(client.phone)}` : ""}
          </p>
          <div className="mt-4 overflow-x-auto pb-1">
            <MonthStrip strip={strip} clientId={client.id} selected={period} />
          </div>
        </header>

        <section aria-labelledby="period-title" className="overflow-hidden rounded-lg border border-rule bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <h2 id="period-title" className="text-lg font-bold">
                {periodLabel(period)}
              </h2>
              <StatusMark status={status} />
            </div>
            <div className="flex flex-wrap gap-2">
              <PeriodCloseButton clientId={client.id} periodKey={key} closed={row.closed} />
              {status === "missing" || status === "empty" ? (
                <ReminderButton
                  clientId={client.id}
                  periodKey={key}
                  phone={client.phone}
                  message={reminderMessage({
                    contactName: client.contactName,
                    officeName: user.officeName,
                    period,
                    collectionDay: user.collectionDay,
                    missing: row.missing.map((m) => m.name),
                    link,
                  })}
                />
              ) : null}
            </div>
          </div>

          {row.missing.length > 0 ? (
            <div className="border-b border-rule bg-sunday-soft/60 px-4 py-3 sm:px-5">
              <p className="text-sm font-semibold text-sunday">Eksik: {row.missing.map((m) => m.name).join(", ")}</p>
            </div>
          ) : null}

          {docs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Bu dönem için henüz belge gelmedi.</p>
          ) : (
            <div className="divide-y divide-rule">
              {docs.map((doc) => (
                <DocumentReview key={doc.id} doc={doc} types={types} showClient={false} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="edit-title" className="rounded-lg border border-rule bg-card p-4 sm:p-5">
          <h2 id="edit-title" className="mb-4 text-lg font-bold">
            Bilgiler
          </h2>
          <ClientForm action={boundUpdate} client={client} submitLabel="Kaydet" />
        </section>
      </div>

      <div className="flex flex-col gap-4">
        <PortalLinkCard clientId={client.id} url={link} enabled={client.portalEnabled} />
        <RequirementsEditor key={client.requiredTypeIds.join(",")} clientId={client.id} types={types} initial={client.requiredTypeIds} />
      </div>
    </div>
  );
}
