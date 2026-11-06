import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { ClientForm } from "@/components/client-form";
import { createClient } from "@/lib/actions/office";

export const metadata = { title: "Yeni mükellef" };

export default function NewClientPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <Link href="/mukellefler" className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        Mükellefler
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Yeni mükellef</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Kaydettiğinizde mükellefe özel yükleme linki oluşur. Beklenen evraklar varsayılan olarak alış, satış faturası ve banka ekstresidir; sonra değiştirebilirsiniz.
      </p>
      <div className="rounded-lg border border-rule bg-card p-4 sm:p-6">
        <ClientForm action={createClient} submitLabel="Mükellefi ekle" />
      </div>
    </div>
  );
}
