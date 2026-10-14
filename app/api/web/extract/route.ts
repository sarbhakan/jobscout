import { extractText } from "@/lib/cv/text-extract";
import { detectFileKind } from "@/lib/cv/detect";
import { failure, HttpError } from "@/lib/web/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError("Fichier manquant.", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 5_000_000) { await reader.cancel(); throw new HttpError("Le CV doit faire moins de 5 Mo.", 413); }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    const filename = request.headers.get("x-filename") ?? "cv.txt";
    if (!["pdf", "docx", "txt"].includes(detectFileKind(buffer, filename))) throw new HttpError("Choisissez un PDF texte, DOCX ou TXT.", 415);
    const result = await extractText(buffer, filename);
    if (result.text.trim().length < 30) throw new HttpError("Ce CV ne contient pas assez de texte lisible. Collez son texte ou utilisez un PDF texte.", 422);
    return Response.json({ text: result.text.slice(0, 40000), wordCount: result.wordCount }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return failure(error); }
}
