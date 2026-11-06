"use client";

import { useActionState, useRef, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { addDocumentType, setDocumentTypeArchived, updateOffice } from "@/lib/actions/office";
import type { DocumentType } from "@/lib/data";

export function OfficeForm({ name, collectionDay, canEdit }: { name: string; collectionDay: number; canEdit: boolean }) {
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof updateOffice>[0], formData: FormData) => {
    const result = await updateOffice(prev, formData);
    if (!result?.error && !result?.fieldErrors) toast.success("Ofis ayarları kaydedildi");
    return result;
  }, undefined);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]" noValidate>
      {state?.error ? (
        <p role="alert" className="rounded-md bg-sunday-soft px-3 py-2 text-sm text-sunday sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <Field label="Ofis adı" name="name" defaultValue={state?.values?.name ?? name} error={state?.fieldErrors?.name} disabled={!canEdit} />
      <Field
        label="Son teslim günü"
        name="collectionDay"
        type="number"
        min={1}
        max={28}
        defaultValue={state?.values?.collectionDay ?? collectionDay}
        error={state?.fieldErrors?.collectionDay}
        hint="Takip eden ayın kaçında"
        disabled={!canEdit}
      />
      {canEdit ? (
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function DocumentTypes({ types }: { types: DocumentType[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof addDocumentType>[0], formData: FormData) => {
    const result = await addDocumentType(prev, formData);
    if (result?.error) toast.error(result.error);
    else if (!result?.fieldErrors) {
      formRef.current?.reset();
      toast.success("Evrak türü eklendi");
    }
    return result;
  }, undefined);
  const [toggling, startTransition] = useTransition();

  return (
    <div>
      <ul className="divide-y divide-rule rounded-md border border-rule">
        {types.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className={t.archived ? "text-sm text-muted-foreground line-through" : "text-sm font-medium"}>{t.name}</p>
              {t.hint ? <p className="truncate text-xs text-muted-foreground">{t.hint}</p> : null}
            </div>
            <Button variant="ghost" size="sm" disabled={toggling} onClick={() => startTransition(() => setDocumentTypeArchived(t.id, !t.archived))}>
              {t.archived ? "Geri al" : "Kaldır"}
            </Button>
          </li>
        ))}
      </ul>
      <form ref={formRef} action={action} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-start" noValidate>
        <Field label="Yeni tür" name="name" placeholder="Örn. Akaryakıt fişleri" error={state?.fieldErrors?.name} />
        <Field label="Mükellefe açıklama" name="hint" placeholder="İsteğe bağlı" />
        <Button type="submit" variant="outline" className="h-10 sm:mt-[1.375rem]" disabled={pending}>
          Ekle
        </Button>
      </form>
    </div>
  );
}
