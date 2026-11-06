import { dueDate, MONTHS, periodLabel, type Period } from "@/lib/period";

/** Mükellefe giden hatırlatma metni. Eksik liste boşsa genel bir hatırlatma olur. */
export function reminderMessage(args: {
  contactName: string | null;
  officeName: string;
  period: Period;
  collectionDay: number;
  missing: string[];
  link: string;
}): string {
  const due = dueDate(args.period, args.collectionDay);
  const greeting = args.contactName ? `Merhaba ${args.contactName},` : "Merhaba,";
  const lines = [
    greeting,
    `${periodLabel(args.period)} dönemi için ${args.missing.length > 0 ? "şu evraklarınızı bekliyoruz:" : "evraklarınızı bekliyoruz."}`,
    ...args.missing.map((m) => `• ${m}`),
    "",
    `Son gün: ${due.day} ${MONTHS[due.month - 1]}`,
    `Fotoğraf çekip buradan gönderebilirsiniz: ${args.link}`,
    "",
    args.officeName,
  ];
  return lines.join("\n");
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
