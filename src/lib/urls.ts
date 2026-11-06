import "server-only";

import { headers } from "next/headers";

import { portalToken } from "@/lib/crypto";

/** Mükellefe gönderilen linklerin kökü. Üretimde DEFTERDAR_PUBLIC_URL ayarlanmalı. */
export async function publicBaseUrl(): Promise<string> {
  const fromEnv = process.env.DEFTERDAR_PUBLIC_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // Üretimde Host başlığına güvenilmez; aksi hâlde mesajlara başka bir alan adı sızabilir.
  if (process.env.NODE_ENV === "production") throw new Error("DEFTERDAR_PUBLIC_URL ayarlanmalı.");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function portalUrl(clientId: string, version: number): Promise<string> {
  return `${await publicBaseUrl()}/y/${portalToken(clientId, version)}`;
}
