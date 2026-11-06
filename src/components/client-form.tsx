"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormState } from "@/lib/actions/auth";
import type { ClientDetail } from "@/lib/data";

const KINDS = [
  { value: "sahis", label: "Şahıs" },
  { value: "limited", label: "Limited" },
  { value: "anonim", label: "Anonim" },
  { value: "serbest_meslek", label: "Serbest meslek" },
];

export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  client?: ClientDetail;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (client && !result?.error && !result?.fieldErrors) toast.success("Kaydedildi");
    return result;
  }, undefined);
  const e = state?.fieldErrors;
  const v = state?.values;

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2" noValidate>
      {state?.error ? (
        <p role="alert" className="rounded-md bg-sunday-soft px-3 py-2 text-sm text-sunday sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <Field
        label="Mükellef adı / unvanı"
        name="name"
        required
        className="sm:col-span-2"
        defaultValue={v?.name ?? client?.name}
        error={e?.name}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="f-kind">Tür</Label>
        <Select name="kind" defaultValue={v?.kind ?? client?.kind ?? "sahis"}>
          <SelectTrigger id="f-kind" className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Field label="VKN / TCKN" name="taxId" inputMode="numeric" maxLength={11} defaultValue={v?.taxId ?? client?.taxId ?? ""} error={e?.taxId} hint="İsteğe bağlı" />
      <Field label="Yetkili kişi" name="contactName" autoComplete="off" defaultValue={v?.contactName ?? client?.contactName ?? ""} error={e?.contactName} hint="Hatırlatma mesajında hitap için" />
      <Field
        label="Cep telefonu"
        name="phone"
        type="tel"
        inputMode="tel"
        placeholder="05XX XXX XX XX"
        defaultValue={v?.phone ?? (client?.phone ? `0${client.phone.slice(2)}` : "")}
        error={e?.phone}
        hint="WhatsApp hatırlatmaları bu numaraya"
      />
      <Field label="E-posta" name="email" type="email" className="sm:col-span-2" defaultValue={v?.email ?? client?.email ?? ""} error={e?.email} hint="İsteğe bağlı" />
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" className="h-10 px-4 font-semibold" disabled={pending}>
          {pending ? "Kaydediliyor…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
