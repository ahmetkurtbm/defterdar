"use client";

import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { rotatePortalLink, setPortalEnabled } from "@/lib/actions/office";

export function PortalLinkCard({ clientId, url, enabled }: { clientId: string; url: string; enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <section aria-labelledby="portal-title" className="rounded-lg border border-rule bg-card p-4">
      <h2 id="portal-title" className="font-bold">
        Yükleme linki
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Mükellef bu linkten hesap açmadan belge gönderir.</p>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-input bg-muted/50 px-2.5 py-2">
        <code className={enabled ? "min-w-0 flex-1 truncate text-sm" : "min-w-0 flex-1 truncate text-sm text-muted-foreground line-through"}>{url}</code>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!enabled}
          onClick={() =>
            navigator.clipboard.writeText(url).then(
              () => toast.success("Link kopyalandı"),
              () => toast.error("Kopyalanamadı"),
            )
          }
        >
          <Copy aria-hidden />
          Kopyala
        </Button>
        <Button size="sm" variant="outline" asChild disabled={!enabled}>
          <a href={url} target="_blank" rel="noopener">
            <ExternalLink aria-hidden />
            Aç
          </a>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm("Eski link çalışmayı bırakacak. Mükellefe yeni linki göndermeniz gerekir. Devam edilsin mi?")) return;
            startTransition(async () => {
              const result = await rotatePortalLink(clientId);
              if (result.error) toast.error(result.error);
              else toast.success("Yeni link oluşturuldu");
            });
          }}
        >
          <RefreshCw aria-hidden />
          Yeni link oluştur
        </Button>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-rule pt-3">
        <Checkbox
          id="portal-enabled"
          checked={enabled}
          disabled={pending}
          onCheckedChange={(value) => startTransition(() => setPortalEnabled(clientId, value === true))}
        />
        <Label htmlFor="portal-enabled" className="text-sm font-normal">
          Link açık
        </Label>
      </div>
    </section>
  );
}
