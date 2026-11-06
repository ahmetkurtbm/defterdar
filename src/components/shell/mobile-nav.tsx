"use client";

import { Menu } from "lucide-react";
import { Suspense, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { Brand } from "./brand";
import { Nav, NavLinks } from "./nav";

export function MobileNav({ pendingBadge, footer }: { pendingBadge?: ReactNode; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-sidebar-border bg-cover px-4 text-cover-foreground lg:hidden">
      <Brand />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-lg" className="text-cover-foreground hover:bg-sidebar-accent hover:text-cover-foreground" aria-label="Menüyü aç">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-cover p-3 text-cover-foreground">
          <SheetTitle className="sr-only">Menü</SheetTitle>
          <Brand className="mb-6 px-2.5 pt-1.5" />
          <Suspense fallback={<NavLinks pendingBadge={pendingBadge} pathname={null} />}>
            <Nav pendingBadge={pendingBadge} onNavigate={() => setOpen(false)} />
          </Suspense>
          <div className="mt-auto">{footer}</div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
