import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export type ClassifyInput = {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  /** Ofisin aktif evrak türleri (kod → ad). */
  types: { code: string; name: string; hint: string | null }[];
};

export type Classification = {
  code: string | null;
  confidence: number;
  note: string;
  source: "ai" | "heuristic";
};

// Dosya adından tür tahmini. İçerikten sınıflandırma kapalıyken ya da başarısız olduğunda kullanılır.
const KEYWORDS: [string, RegExp][] = [
  ["banka_ekstresi", /ekstre|hesap.?hareket|dekont|statement/i],
  ["pos_raporu", /\bpos\b|slip|kredi.?kart/i],
  ["z_raporu", /z.?rapor|yazar.?kasa|ökc|okc/i],
  ["kira_makbuzu", /kira/i],
  ["gider_pusulasi", /gider.?pusula/i],
  ["sgk_belgesi", /sgk|puantaj|bordro|ise.?giris/i],
  ["satis_faturasi", /sat[ıi]ş|satis|kesilen|giden/i],
  ["alis_faturasi", /fatura|al[ıi]ş|alis|gelen|e-?ar[sş]iv|invoice/i],
];

export function classifyByName(fileName: string, codes: Set<string>): Classification {
  for (const [code, pattern] of KEYWORDS) {
    if (codes.has(code) && pattern.test(fileName)) {
      return { code, confidence: 0.4, note: "Dosya adına göre tahmin edildi.", source: "heuristic" };
    }
  }
  return { code: null, confidence: 0, note: "Dosya adından tür çıkarılamadı.", source: "heuristic" };
}

const ResultSchema = z.object({
  code: z.string().describe("Listeden tek bir evrak türü kodu; hiçbiri uymuyorsa 'diger'"),
  confidence: z.number().describe("0 ile 1 arası güven"),
  note: z.string().describe("Belgede görülenin tek cümlelik Türkçe özeti: düzenleyen, tarih, tutar"),
});

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_AI_BYTES = 8 * 1024 * 1024;

let client: Anthropic | null = null;

function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.DEFTERDAR_AI !== "0";
}

/**
 * Belgeyi ofisin evrak türlerinden birine yerleştirir. Sonuç yalnızca öneridir;
 * müşavir onaylayana kadar belge "onay bekliyor" durumunda kalır.
 */
export async function classifyDocument(input: ClassifyInput): Promise<Classification> {
  const codes = new Set(input.types.map((t) => t.code));
  const byName = classifyByName(input.fileName, codes);

  const supported = IMAGE_TYPES.has(input.mimeType) || input.mimeType === "application/pdf";
  if (!aiEnabled() || !supported || input.bytes.length > MAX_AI_BYTES) return byName;

  client ??= new Anthropic();
  const data = input.bytes.toString("base64");
  const fileBlock: Anthropic.Beta.BetaContentBlockParam =
    input.mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : {
          type: "image",
          source: { type: "base64", media_type: input.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data },
        };

  const typeList = input.types
    .map((t) => `- ${t.code}: ${t.name}${t.hint ? ` (${t.hint})` : ""}`)
    .join("\n");

  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2048,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(ResultSchema) },
      system:
        "Bir Türk mali müşavirlik ofisine mükelleften gelen belgeyi sınıflandırıyorsun. " +
        "Belgeyi yalnızca verilen evrak türü kodlarından birine ata. Okunamıyorsa güveni düşük ver.",
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            { type: "text", text: `Dosya adı: ${input.fileName}\n\nEvrak türleri:\n${typeList}` },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) return byName;
    const result = response.parsed_output;
    const code = codes.has(result.code) ? result.code : codes.has("diger") ? "diger" : null;
    return {
      code,
      confidence: Math.min(1, Math.max(0, result.confidence)),
      note: result.note.slice(0, 300),
      source: "ai",
    };
  } catch (error) {
    console.error("[classify] içerikten sınıflandırma başarısız, dosya adına düşülüyor", error);
    return { ...byName, note: `${byName.note} (içerik okunamadı)` };
  }
}

