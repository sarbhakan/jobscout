import assert from "node:assert/strict";
const base = process.env.JOBSCOUT_TEST_URL || "http://127.0.0.1:3000";
const get = (path) => fetch(`${base}${path}`);
const rpc = async (id, method, params) => {
  const response = await fetch(`${base}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }) });
  assert.equal(response.status, 200);
  const data = await response.json(); assert.equal(data.error, undefined, JSON.stringify(data.error)); return data.result;
};
const health = await (await get("/api/health")).json(); assert.equal(health.status, "ok"); assert.equal(health.modelApi, false);
const page = await get("/"); assert.equal(page.status, 200); assert.match(await page.text(), /Un job qui vous ressemble/);
for (const path of ["/api/profile", "/api/settings/llm", "/dashboard"]) assert.equal((await get(path)).status, 404);
const init = await rpc(1, "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "jobscout-smoke", version: "1" } }); assert.equal(init.serverInfo.name, "jobscout");
const tools = await rpc(2, "tools/list"); assert.equal(tools.tools.length, 4);
const widget = await rpc(3, "resources/read", { uri: "ui://jobscout/workspace.html" }); assert.match(widget.contents[0].text, /jobscout/);
const application = {
  cv: { identity: { full_name: "Camille Exemple" }, summary: "Développeuse TypeScript.", sections: { experiences: [{ title: "Développeuse", company: "Exemple", bullet_points: ["Création d'interfaces TypeScript."] }], skills_flat: ["TypeScript"] } },
  letter: { object: "Candidature développeuse", body_paragraphs: ["Votre offre a retenu mon attention.", "J'ai réalisé des interfaces TypeScript.", "Je souhaite contribuer à vos projets.", "Je suis disponible pour un entretien."] },
  company: "Exemple",
};
const result = await rpc(4, "tools/call", { name: "render_application", arguments: application }); assert.notEqual(result.isError, true);
assert.equal(result._meta.files.length, 4);
for (const file of result._meta.files) {
  const buffer = Buffer.from(file.base64, "base64"); assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(0, file.filename.endsWith("pdf") ? 4 : 2).toString(), file.filename.endsWith("pdf") ? "%PDF" : "PK");
}
const fresh = await rpc(5, "tools/call", { name: "open_jobscout", arguments: {} }); assert.ok(!JSON.stringify(fresh).includes("Camille"));
const foreign = await fetch(`${base}/api/web/export`, { method: "POST", headers: { origin: "https://other.example.org", "content-type": "application/json" }, body: JSON.stringify(application) }); assert.equal(foreign.status, 403);
console.log("Smoke passed: site, health, legacy isolation, MCP initialize/tools/widget, 4 PDF/DOCX downloads, request isolation, foreign-origin rejection.");
