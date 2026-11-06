"use client";

import { useActionState } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { register } from "@/lib/actions/auth";

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);
  const e = state?.fieldErrors;
  const v = state?.values;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error ? (
        <p role="alert" className="rounded-md bg-sunday-soft px-3 py-2 text-sm text-sunday">
          {state.error}
        </p>
      ) : null}
      <Field label="Ofis adı" name="officeName" autoComplete="organization" placeholder="Örn. Yılmaz Mali Müşavirlik" required defaultValue={v?.officeName} error={e?.officeName} />
      <Field label="Adınız" name="name" autoComplete="name" required defaultValue={v?.name} error={e?.name} />
      <Field label="E-posta" name="email" type="email" autoComplete="email" required defaultValue={v?.email} error={e?.email} />
      <Field label="Şifre" name="password" type="password" autoComplete="new-password" required hint="En az 10 karakter." error={e?.password} />
      <Button type="submit" size="lg" className="h-10 font-semibold" disabled={pending}>
        {pending ? "Hesap açılıyor…" : "Hesabı aç"}
      </Button>
    </form>
  );
}
