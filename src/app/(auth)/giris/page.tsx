import Link from "next/link";

import { BrandMark } from "@/components/shell/brand";

import { LoginForm } from "./login-form";

export const metadata = { title: "Giriş" };

export default function LoginPage() {
  const demo = process.env.NODE_ENV !== "production";
  return (
    <>
      <BrandMark className="mb-6 size-9 text-ink lg:hidden" />
      <h1 className="text-2xl font-bold">Giriş yap</h1>
      <p className="mt-1 mb-6 text-muted-foreground">Ofis hesabınızla devam edin.</p>
      <LoginForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-primary underline">
          Ofisinizi kaydedin
        </Link>
      </p>
      {demo ? (
        <p className="mt-8 rounded-md border border-dashed border-input px-3 py-2.5 text-sm text-muted-foreground">
          Geliştirme ortamı: demo ofis <span className="font-semibold text-foreground">demo@defterdar.test</span> /{" "}
          <span className="font-semibold text-foreground">defterdar-demo</span>
        </p>
      ) : null}
    </>
  );
}
