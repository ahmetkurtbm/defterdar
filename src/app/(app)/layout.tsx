import { LogOut } from "lucide-react";
import { Suspense } from "react";

import { Brand } from "@/components/shell/brand";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Nav, NavLinks } from "@/components/shell/nav";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { countPendingDocuments } from "@/lib/data";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const pendingBadge = (
    <Suspense fallback={null}>
      <PendingBadge />
    </Suspense>
  );
  const footer = (
    <Suspense fallback={<div className="h-14" />}>
      <UserBlock />
    </Suspense>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-cover p-3 text-cover-foreground lg:flex">
        <Brand className="mb-7 px-2.5 pt-2" />
        <Suspense fallback={<NavLinks pendingBadge={pendingBadge} pathname={null} />}>
          <Nav pendingBadge={pendingBadge} />
        </Suspense>
        <div className="mt-auto">{footer}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav pendingBadge={pendingBadge} footer={footer} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

async function PendingBadge() {
  const user = await getCurrentUser();
  if (!user) return null;
  const count = await countPendingDocuments(user);
  if (count === 0) return null;
  return (
    <span className="rounded-sm bg-review px-1.5 py-px text-xs font-bold tabular-nums text-white" aria-label={`${count} belge onay bekliyor`}>
      {count}
    </span>
  );
}

async function UserBlock() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="border-t border-sidebar-border px-2.5 pt-3">
      <p className="truncate text-sm font-semibold">{user.name}</p>
      <p className="truncate text-xs text-cover-muted">{user.officeName}</p>
      <form action={logout} className="mt-2">
        <button
          type="submit"
          className="-ml-1 flex h-8 items-center gap-2 rounded-md px-1 text-sm text-cover-muted transition-colors hover:text-cover-foreground"
        >
          <LogOut className="size-4" aria-hidden />
          Çıkış yap
        </button>
      </form>
    </div>
  );
}
