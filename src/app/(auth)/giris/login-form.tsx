"use client";

import { useActionState } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error ? (
        <p role="alert" className="rounded-md bg-sunday-soft px-3 py-2 text-sm text-sunday">
          {state.error}
        </p>
      ) : null}
      <Field label="E-posta" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} error={state?.fieldErrors?.email} />
      <Field label="Şifre" name="password" type="password" autoComplete="current-password" required error={state?.fieldErrors?.password} />
      <Button type="submit" size="lg" className="h-10 font-semibold" disabled={pending}>
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
    </form>
  );
}
