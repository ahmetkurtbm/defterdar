import { cn } from "@/lib/utils";

/** Takvim yaprağı işareti: üstte iki halka, altta kırmızı şerit. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn("size-7", className)}>
      <rect x="3" y="5" width="22" height="20" rx="2.5" fill="var(--paper)" />
      <rect x="3" y="5" width="22" height="6" rx="2.5" fill="var(--sunday)" />
      <rect x="3" y="9" width="22" height="2" fill="var(--sunday)" />
      <rect x="8.5" y="2.5" width="2.4" height="6" rx="1.2" fill="currentColor" />
      <rect x="17.1" y="2.5" width="2.4" height="6" rx="1.2" fill="currentColor" />
      <path d="M9.5 14.5h4.2a4 4 0 0 1 0 8H9.5z" fill="none" stroke="var(--ink)" strokeWidth="2.2" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[1.15rem] font-extrabold tracking-tight [font-stretch:85%]">Defterdar</span>
    </span>
  );
}
