"use client";

import { Check, ExternalLink, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { DocumentStatus } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reviewDocument, setDocumentType } from "@/lib/actions/office";
import type { DocumentRow, DocumentType } from "@/lib/data";
import { formatBytes, formatDateTime } from "@/lib/format";
import { MONTHS } from "@/lib/period";
import { cn } from "@/lib/utils";

/** Tek belgenin onay satırı: tür seçimi, önerilen tür, onayla / reddet. */
export function DocumentReview({ doc, types, showClient = true }: { doc: DocumentRow; types: DocumentType[]; showClient?: boolean }) {
  const [typeId, setTypeId] = useState(doc.typeId ?? "");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const aiAgrees = doc.aiTypeName && doc.typeName === doc.aiTypeName;

  function run(fn: () => Promise<{ error?: string }>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.error) toast.error(result.error);
      else toast.success(success);
    });
  }

  return (
    <article id={doc.id} className="grid scroll-mt-20 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
      <div className="min-w-0">
        {showClient ? <p className="text-sm font-semibold">{doc.clientName}</p> : null}
        <a
          href={`/api/files/${doc.id}`}
          target="_blank"
          rel="noopener"
          className="group mt-0.5 inline-flex max-w-full items-center gap-1.5 text-[0.95rem] hover:underline"
        >
          <span className="truncate">{doc.originalName}</span>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">(yeni sekmede açılır)</span>
        </a>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {MONTHS[doc.periodMonth - 1]} {doc.periodYear} · {formatBytes(doc.sizeBytes)} · {formatDateTime(doc.uploadedAt)} ·{" "}
          {doc.source === "portal" ? "mükellef yükledi" : "ofis yükledi"}
        </p>

        {doc.aiNote ? (
          <p className={cn("mt-2 flex gap-1.5 text-sm", doc.aiStatus === "done" ? "text-foreground" : "text-muted-foreground")}>
            <span className="mt-px shrink-0 rounded-sm border border-rule px-1 text-[0.6875rem] font-semibold text-muted-foreground">Öneri</span>
            <span>
              {doc.aiStatus === "done" && doc.aiTypeName ? (
                <>
                  <span className="font-semibold">{doc.aiTypeName}</span>
                  {doc.aiConfidence !== null ? <span className="text-muted-foreground"> · güven %{Math.round(doc.aiConfidence * 100)}</span> : null}
                  {" — "}
                </>
              ) : null}
              {doc.aiNote}
            </span>
          </p>
        ) : doc.aiStatus === "queued" ? (
          <p className="mt-2 text-sm text-muted-foreground">Belge inceleniyor…</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:w-72">
        {doc.status !== "pending" ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{doc.typeName ?? "Türsüz"}</span>
            <DocumentStatus status={doc.status} />
          </div>
        ) : rejecting ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => reviewDocument(doc.id, { status: "rejected", reason }), "Belge reddedildi");
            }}
          >
            <label htmlFor={`reason-${doc.id}`} className="text-sm font-medium">
              Mükellefe görünecek sebep
            </label>
            <Input
              id={`reason-${doc.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn. Fotoğraf bulanık, yeniden çekin"
              autoFocus
              maxLength={300}
              className="h-9"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" size="sm" disabled={pending || reason.trim().length < 3}>
                Reddet
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)}>
                Vazgeç
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className="sr-only" htmlFor={`type-${doc.id}`}>
                Evrak türü
              </label>
              <Select
                value={typeId}
                onValueChange={(value) => {
                  setTypeId(value);
                  run(() => setDocumentType(doc.id, value), "Tür güncellendi");
                }}
              >
                <SelectTrigger id={`type-${doc.id}`} className="h-9 w-full">
                  <SelectValue placeholder="Evrak türünü seçin" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {aiAgrees ? <p className="text-xs text-muted-foreground">Önerilen tür seçili</p> : null}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-done text-white hover:bg-done/90"
                disabled={pending || !typeId}
                onClick={() => run(() => reviewDocument(doc.id, { status: "accepted" }, typeId), "Belge onaylandı")}
              >
                <Check aria-hidden />
                Onayla
              </Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={pending} onClick={() => setRejecting(true)}>
                <X aria-hidden />
                Reddet
              </Button>
            </div>
          </>
        )}
        {doc.status === "rejected" && doc.rejectReason ? <p className="text-xs text-sunday">Sebep: {doc.rejectReason}</p> : null}
      </div>
    </article>
  );
}
