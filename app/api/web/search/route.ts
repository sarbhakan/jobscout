import { searchJobs } from "@/lib/web/jobs";
import { readJson, failure } from "@/lib/web/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try { return Response.json(await searchJobs(await readJson(request)), { headers: { "cache-control": "no-store" } }); }
  catch (error) { return failure(error); }
}
