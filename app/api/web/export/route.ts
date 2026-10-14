import { exportSchema } from "@/lib/web/schemas";
import { renderApplication } from "@/lib/web/documents";
import { readJson, failure, HttpError } from "@/lib/web/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = exportSchema.parse(await readJson(request));
    const result = await renderApplication(input);
    const filename = `${input.document === "cv" ? "cv-adapte" : "lettre-motivation"}.${input.format}`;
    const file = result.files.find((f) => f.filename === filename);
    if (!file) throw new HttpError("Aucune lettre fournie.", 400);
    return new Response(new Uint8Array(file.buffer), { headers: {
      "content-type": file.mime, "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store",
    } });
  } catch (error) { return failure(error); }
}
