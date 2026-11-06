"use client";

import { AlertCircle, Camera, Check, FileUp, Loader2, Plus, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Item = { name: string; file: File; state: "uploading" | "done" | "duplicate" | "error"; progress: number; error?: string };

const MAX_EDGE = 2400;

/** Telefon fotoğraflarını yavaş bağlantı için küçültür; PDF ve diğerlerine dokunmaz. */
async function shrink(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function send(token: string, file: File, typeId: string | null, onProgress: (p: number) => void) {
  return new Promise<{ ok: boolean; duplicate?: boolean; error?: string }>((resolve) => {
    const body = new FormData();
    body.append("file", file);
    if (typeId) body.append("typeId", typeId);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/portal/${encodeURIComponent(token)}/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        resolve(xhr.status < 300 ? { ok: true, duplicate: json.duplicate } : { ok: false, error: json.error ?? "Yüklenemedi." });
      } catch {
        resolve({ ok: false, error: "Yüklenemedi. Lütfen tekrar deneyin." });
      }
    };
    xhr.onerror = () => resolve({ ok: false, error: "Bağlantı koptu. İnternetinizi kontrol edip tekrar deneyin." });
    xhr.send(body);
  });
}

export function Uploader({
  token,
  typeId,
  label,
  hint,
  received,
  accept,
  variant = "row",
}: {
  token: string;
  typeId: string | null;
  label: string;
  hint?: string | null;
  received: number;
  accept: string;
  variant?: "row" | "other";
}) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  // Sunucu yenilenmeden önce de başarı hemen görünsün (yaşlı kullanıcı "oldu mu?" diye beklemesin).
  const [initialReceived] = useState(received);
  const busy = items.some((i) => i.state === "uploading");
  const id = useId();

  async function upload(index: number, original: File) {
    const update = (patch: Partial<Item>) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    update({ state: "uploading", progress: 0, error: undefined });
    const file = await shrink(original);
    const result = await send(token, file, typeId, (progress) => update({ progress }));
    update(result.ok ? { state: result.duplicate ? "duplicate" : "done", progress: 1 } : { state: "error", error: result.error });
  }

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const start = items.length;
    setItems((prev) => [...prev, ...list.map((f) => ({ name: f.name, file: f, state: "uploading" as const, progress: 0 }))]);
    for (const [offset, original] of list.entries()) await upload(start + offset, original);
    router.refresh();
  }

  async function retry(index: number) {
    await upload(index, items[index].file);
    router.refresh();
  }

  const sentNow = items.filter((i) => i.state === "done").length;
  const count = Math.max(received, initialReceived + sentNow);
  const done = count > 0;
  const justSent = sentNow > 0 && !busy;
  const quiet = done && variant === "row";

  return (
    <div className={cn("px-4 py-4", variant === "other" && "bg-muted/50")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2",
            variant === "other"
              ? "border-input text-muted-foreground"
              : done
                ? "border-done bg-done text-white"
                : "border-sunday/50 text-transparent",
          )}
          aria-hidden
        >
          {variant === "other" ? <Plus className="size-4" strokeWidth={3} /> : <Check className="size-4" strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <p id={`${id}-label`} className="text-lg leading-snug font-bold">
            {label}
          </p>
          <p className="text-[0.95rem] text-muted-foreground">
            {variant === "row" && done ? `${count} belge gönderildi` : hint ?? "Henüz gönderilmedi"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 pl-10">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
          aria-describedby={`${id}-label`}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-lg text-base font-semibold transition-colors disabled:opacity-60",
            quiet ? "border-2 border-input bg-card active:bg-muted" : "bg-primary text-primary-foreground active:bg-primary/85",
          )}
        >
          <Camera className="size-5" aria-hidden />
          {quiet ? "Bir tane daha" : "Fotoğraf çek"}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-describedby={`${id}-label`}
          className="flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-input bg-card text-base font-semibold transition-colors active:bg-muted disabled:opacity-60"
        >
          <FileUp className="size-5" aria-hidden />
          Dosya seç
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => { void handle(e.target.files); e.target.value = ""; }} />
        <input ref={fileRef} type="file" accept={accept} multiple className="sr-only" tabIndex={-1} onChange={(e) => { void handle(e.target.files); e.target.value = ""; }} />
      </div>

      {justSent ? (
        <p className="mt-3 ml-10 flex items-center gap-2 rounded-lg bg-done-soft px-3 py-2.5 font-semibold text-done" role="status">
          <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden />
          Alındı, teşekkürler. Başka sayfa varsa tekrar çekin.
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5 pl-10" aria-live="polite">
          {items.map((it, i) => (
            <li key={i} className="text-[0.95rem]">
              <div className="flex items-center gap-2">
                {it.state === "uploading" ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                ) : it.state === "error" ? (
                  <AlertCircle className="size-4 shrink-0 text-sunday" aria-hidden />
                ) : (
                  <Check className="size-4 shrink-0 text-done" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate">{it.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {it.state === "uploading"
                    ? `%${Math.round(it.progress * 100)}`
                    : it.state === "done"
                      ? "Gönderildi"
                      : it.state === "duplicate"
                        ? "Zaten gönderilmiş"
                        : ""}
                </span>
              </div>
              {it.state === "error" ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-sunday">{it.error}</p>
                  <button
                    type="button"
                    onClick={() => void retry(i)}
                    disabled={busy}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border-2 border-input bg-card px-3 text-sm font-semibold active:bg-muted"
                  >
                    <RotateCw className="size-4" aria-hidden />
                    Tekrar dene
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
