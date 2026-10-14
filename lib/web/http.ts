import "server-only";
import { z } from "zod";

export class HttpError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function readJson(request: Request, maxBytes = 256_000): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new HttpError("JSON requis.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError("Requête vide.", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > maxBytes) { await reader.cancel(); throw new HttpError("Requête trop volumineuse.", 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new HttpError("JSON invalide.", 400); }
}

export function failure(error: unknown) {
  const status = error instanceof HttpError ? error.status : error instanceof z.ZodError ? 400 : 500;
  const message = error instanceof HttpError ? error.message : error instanceof z.ZodError ? "Vérifiez les champs de votre demande." : "L'opération a échoué. Réessayez avec un document plus court.";
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}
