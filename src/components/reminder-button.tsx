"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { recordReminder } from "@/lib/actions/office";

/**
 * WhatsApp'ta hazır mesajla sohbet açar. Telefon yoksa mesajı panoya kopyalar.
 * Her iki durumda da hatırlatma kaydı düşülür.
 */
export function ReminderButton({
  clientId,
  periodKey,
  message,
  phone,
  size = "sm",
  label,
}: {
  clientId: string;
  periodKey: string;
  message: string;
  phone: string | null;
  size?: "sm" | "default";
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  function send() {
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      startTransition(() => recordReminder(clientId, periodKey, "whatsapp"));
      return;
    }
    navigator.clipboard.writeText(message).then(
      () => {
        toast.success("Hatırlatma metni kopyalandı", { description: "Telefon kayıtlı değil; mesajı istediğiniz kanaldan gönderin." });
        startTransition(() => recordReminder(clientId, periodKey, "copy"));
      },
      () => toast.error("Metin kopyalanamadı"),
    );
  }

  return (
    <Button variant="outline" size={size} onClick={send} disabled={pending}>
      {phone ? <MessageCircle aria-hidden /> : <Copy aria-hidden />}
      {label ?? (phone ? "Hatırlat" : "Metni kopyala")}
    </Button>
  );
}
