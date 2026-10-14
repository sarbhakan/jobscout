import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createJobScoutServer, WIDGET_URI, CHATGPT_WIDGET_URI } from "@/lib/mcp/server";
import { POST as mcpPost } from "@/app/mcp/route";
import { searchJobs } from "@/lib/web/jobs";
import { applicationSchema } from "@/lib/web/schemas";
import { renderApplication } from "@/lib/web/documents";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";
import { candidaturesToXlsx, xlsxToCandidatures } from "@/lib/excel/io";

const application = applicationSchema.parse({
  cv: {
    identity: { full_name: "Alice Exemple", email: "alice@example.org" },
    summary: "Développeuse TypeScript et SQL avec une expérience en produits web.",
    sections: { experiences: [{ title: "Développeuse", company: "Entreprise Exemple", start_date: "2022", end_date: "2025", bullet_points: ["Développement d'une interface TypeScript et de requêtes SQL."] }], skills_flat: ["TypeScript", "SQL"] },
  },
  letter: { object: "Candidature développeuse", body_paragraphs: ["Votre poste de développeuse a retenu mon attention.", "Mon expérience porte sur TypeScript et SQL.", "Je souhaite contribuer aux produits de votre équipe.", "Je suis disponible pour un entretien."] },
  company: "Entreprise Exemple",
});
afterEach(() => vi.restoreAllMocks());

describe("Public web boundary", () => {
  it("permits the site and MCP while blocking every legacy personal-data route", () => {
    for (const path of ["/", "/connect", "/mcp", "/api/web/search"]) expect(middleware(new NextRequest(`https://jobs.example.org${path}`)).status).toBe(200);
    for (const path of ["/api/profile", "/api/settings/llm", "/api/documents/1", "/dashboard", "/profile"]) expect(middleware(new NextRequest(`https://jobs.example.org${path}`)).status).toBe(404);
  });
  it("rejects a foreign browser origin on web and MCP requests", () => {
    for (const path of ["/mcp", "/api/web/export"]) expect(middleware(new NextRequest(`https://jobs.example.org${path}`, { headers: { origin: "https://other.example.org" } })).status).toBe(403);
  });
  it("uses the actual Host when Next normalizes a loopback URL", () => {
    expect(middleware(new NextRequest("http://localhost:3000/api/web/export", { headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } })).status).toBe(200);
  });
});

describe("Job search", () => {
  it("parses real-source HTML shape and ranks jobs without persistence", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(`<ul><li data-id-offre="123ABC"><h2>Développeur TypeScript</h2><p class="subtext">Exemple - 75 - Paris</p><dd>CDI</dd><p>Développement TypeScript et SQL.</p></li><li data-id-offre="456DEF"><h2>Comptable</h2><p class="subtext">Autre - Lyon</p><p>Comptabilité annuelle.</p></li></ul>`));
    const result = await searchJobs({ query: "développeur", location: "Paris", skills: ["TypeScript", "SQL"] });
    expect(result.status).toBe("ok"); expect(result.jobs[0].id).toBe("123ABC");
    expect(result.jobs[0].url).toBe("https://candidat.francetravail.fr/offres/recherche/detail/123ABC");
    expect(result.jobs[0].score).toBeGreaterThan(result.jobs[1].score!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("distinguishes access denial from an empty result and supplies usable source links", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Denied", { status: 403 }));
    const result = await searchJobs({ query: "développeur" });
    expect(result.status).toBe("unavailable"); expect(result.links[0].url).toContain("motsCles=d%C3%A9veloppeur");
  });
});

describe("Documents without model APIs", () => {
  it("produces readable PDF and DOCX for a CV and a letter without any network request", async () => {
    const nativeFetch = globalThis.fetch;
    const externalRequests: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      // react-pdf loads its npm-bundled Yoga WASM via a data URI: no network.
      if (url.startsWith("data:")) return nativeFetch(input, init);
      externalRequests.push(url); throw new Error("No network allowed");
    });
    const result = await renderApplication(application);
    expect(result.files).toHaveLength(4);
    for (const f of result.files) {
      expect(f.buffer.length).toBeGreaterThan(1000);
      expect(f.buffer.subarray(0, f.filename.endsWith("pdf") ? 4 : 2).toString()).toBe(f.filename.endsWith("pdf") ? "%PDF" : "PK");
    }
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({ data: new Uint8Array(result.files[0].buffer), isEvalSupported: false, useSystemFonts: true });
    const parsed = await task.promise;
    expect(parsed.numPages).toBe(1);
    const content = await (await parsed.getPage(1)).getTextContent();
    expect(content.items.map((item) => "str" in item ? item.str : "").join(" ")).toContain("ALICE EXEMPLE");
    await task.destroy();
    const mammoth = await import("mammoth");
    const docx = await mammoth.extractRawText({ buffer: result.files[1].buffer });
    expect(docx.value).toContain("Alice Exemple"); expect(docx.value).toContain("TypeScript");
    expect(externalRequests).toEqual([]);
  });
  it("round-trips the original Excel export/import contract through ExcelJS", async () => {
    const file = await candidaturesToXlsx([{ applied_at: "2026-10-15", ext_company: "Exemple", ext_title: "Développeuse", status: "envoyee", ext_score: 82 }] as Parameters<typeof candidaturesToXlsx>[0]);
    const rows = await xlsxToCandidatures(file);
    expect(rows[0]).toMatchObject({ ext_company: "Exemple", ext_title: "Développeuse", ext_score: 82, status: "envoyee" });
  });
});

describe("MCP integration", () => {
  it("initializes over Streamable HTTP and serves tools without a session cookie", async () => {
    const request = (body: object) => new Request("http://localhost:3000/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify(body) });
    const init = await mcpPost(request({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } } }));
    expect(init.status).toBe(200); expect((await init.json()).result.serverInfo.name).toBe("jobscout");
    expect(init.headers.get("set-cookie")).toBeNull(); expect(init.headers.get("mcp-session-id")).toBeNull();
    const list = await mcpPost(request({ jsonrpc: "2.0", id: 2, method: "tools/list" }));
    expect((await list.json()).result.tools.map((tool: { name: string }) => tool.name)).toEqual(["open_jobscout", "search_jobs", "rank_jobs", "render_application"]);
  });
  it("exposes the widget and returns downloads only to the calling client", async () => {
    const server = createJobScoutServer(); const client = new Client({ name: "test", version: "1" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport); await client.connect(clientTransport);
    try {
      const tools = await client.listTools();
      expect(tools.tools[0]._meta?.["openai/outputTemplate"]).toBe(CHATGPT_WIDGET_URI);
      const resource = await client.readResource({ uri: WIDGET_URI });
      expect(resource.contents[0].mimeType).toContain("mcp-app");
      expect((resource.contents[0] as { text: string }).text).toContain("jobscout");
      const chatgptResource = await client.readResource({ uri: CHATGPT_WIDGET_URI });
      expect(chatgptResource.contents[0].mimeType).toBe("text/html+skybridge");
      const rendered = await client.callTool({ name: "render_application", arguments: application });
      expect(rendered.isError).not.toBe(true);
      expect((rendered._meta?.files as unknown[]).length).toBe(4);
      const next = await client.callTool({ name: "open_jobscout", arguments: {} });
      expect(JSON.stringify(next)).not.toContain("Alice"); expect(next._meta?.files).toBeUndefined();
    } finally { await client.close(); await server.close(); }
  });
});
