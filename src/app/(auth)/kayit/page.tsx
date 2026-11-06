import Link from "next/link";

import { BrandMark } from "@/components/shell/brand";

import { RegisterForm } from "./register-form";

export const metadata = { title: "Ofis kaydı" };

export default function RegisterPage() {
  return (
    <>
      <BrandMark className="mb-6 size-9 text-ink lg:hidden" />
      <h1 className="text-2xl font-bold">Ofisinizi kaydedin</h1>
      <p className="mt-1 mb-6 text-muted-foreground">Evrak türleri hazır gelir; ilk mükellefinizi hemen ekleyebilirsiniz.</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Zaten hesabınız var mı?{" "}
        <Link href="/giris" className="font-semibold text-primary underline">
          Giriş yapın
        </Link>
      </p>
    </>
  );
}
