import { BrandMark } from "@/components/shell/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-cover p-10 text-cover-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-xl font-extrabold [font-stretch:85%]">Defterdar</span>
        </div>
        <div className="max-w-md">
          <p className="numeral text-[7rem] text-sunday-on-cover" aria-hidden>
            20
          </p>
          <p className="mt-4 text-2xl leading-snug font-bold">Ay sonunda “kimden ne eksik?” diye aramayın.</p>
          <p className="mt-3 text-cover-muted">
            Mükellef linkten fotoğrafını çeker, belge doğru kutuya düşer, siz yalnızca onaylarsınız.
          </p>
        </div>
        <p className="text-sm text-cover-muted">Mali müşavirler için aylık evrak toplama</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
