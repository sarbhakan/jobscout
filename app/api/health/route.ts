export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ status: "ok", application: "jobscout", mcp: "/mcp", storage: "stateless", modelApi: false });
}
