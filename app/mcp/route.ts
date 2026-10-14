import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createJobScoutServer } from "@/lib/mcp/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
async function handle(request: Request) {
  const server = createJobScoutServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 256_000 });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    response.headers.set("cache-control", "no-store");
    return response;
  } finally { await server.close(); }
}
export const POST = handle;
export const GET = handle;
export const DELETE = handle;
