"use client";

import { CalendarDays, Inbox, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/pano", label: "Bu ay", icon: CalendarDays },
  { href: "/evraklar", label: "Gelen evrak", icon: Inbox, badge: "pending" as const },
  { href: "/mukellefler", label: "Mükellefler", icon: Users },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

type NavProps = { pendingBadge?: ReactNode; onNavigate?: () => void };

export function Nav(props: NavProps) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

/** Ön render'da yol bilinmez; Suspense yedeği aktif öğesiz aynı menüyü çizer. */
export function NavLinks({ pendingBadge, onNavigate, pathname }: NavProps & { pathname: string | null }) {
  return (
    <nav aria-label="Ana menü">
      <ul className="flex flex-col gap-0.5">
        {ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[0.9rem] text-cover-muted transition-colors",
                  "hover:bg-sidebar-accent hover:text-cover-foreground",
                  active && "bg-sidebar-accent font-semibold text-cover-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{label}</span>
                {badge === "pending" ? pendingBadge : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
