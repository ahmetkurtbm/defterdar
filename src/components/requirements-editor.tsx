"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { setRequirements } from "@/lib/actions/office";
import type { DocumentType } from "@/lib/data";

export function RequirementsEditor({ clientId, types, initial }: { clientId: string; types: DocumentType[]; initial: string[] }) {
  const [selected, setSelected] = useState(() => new Set(initial));
  const [pending, startTransition] = useTransition();
  const dirty = selected.size !== initial.length || initial.some((id) => !selected.has(id));

  return (
    <section aria-labelledby="req-title" className="rounded-lg border border-rule bg-card p-4">
      <h2 id="req-title" className="font-bold">
        Her ay beklenen evrak
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Eksik listesi ve hatırlatmalar bu seçime göre hazırlanır.</p>
      <fieldset className="mt-3 grid gap-1">
        <legend className="sr-only">Evrak türleri</legend>
        {types.map((t) => (
          <label key={t.id} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-1.5 text-sm hover:bg-muted/60">
            <Checkbox
              checked={selected.has(t.id)}
              onCheckedChange={(v) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (v === true) next.add(t.id);
                  else next.delete(t.id);
                  return next;
                })
              }
            />
            {t.name}
          </label>
        ))}
      </fieldset>
      <Button
        size="sm"
        className="mt-3"
        disabled={!dirty || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setRequirements(clientId, [...selected]);
            if (result.error) toast.error(result.error);
            else toast.success("Beklenen evraklar güncellendi");
          })
        }
      >
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </section>
  );
}
