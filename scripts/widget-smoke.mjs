import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright";

const script = await readFile("public/jobscout-widget.js", "utf8");
const html = `<html><body><div id="jobscout"></div><script>${script.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
const fixture = { structuredContent: { kind: "jobs", jobs: [{ title: "Développeuse TypeScript", company: "Exemple", location: "Paris", description: "TypeScript", url: "https://example.org/job" }] } };
const hostBundle = await build({ stdin: { contents: `
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
window.connectWidget = async function(frame, fixture) {
  window.events = []; window.widgetReady = false;
  const bridge = new AppBridge(null, { name: 'test-host', version: '1' }, { serverTools: {}, message: { text: {} }, downloadFile: {}, updateModelContext: { structuredContent: {} } });
  bridge.oncalltool = async params => { window.events.push({kind:'tool',params}); return fixture; };
  bridge.onmessage = async params => { window.events.push({kind:'message',params}); return {}; };
  bridge.onupdatemodelcontext = async () => ({});
  bridge.ondownloadfile = async params => { window.events.push({kind:'download',params}); return {}; };
  bridge.oninitialized = () => { window.widgetReady = true; };
  window.widgetBridge = bridge;
  await bridge.connect(new PostMessageTransport(frame.contentWindow, frame.contentWindow));
};`, resolveDir: process.cwd(), sourcefile: "widget-host.js" }, bundle: true, format: "iife", platform: "browser", write: false });
const browser = await chromium.launch({ executablePath: process.env.JOBSCOUT_CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"], headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<iframe id="widget" style="width:800px;height:700px"></iframe>');
  await page.addScriptTag({ content: hostBundle.outputFiles[0].text });
  await page.evaluate(async ({ html, fixture }) => { const frame = document.getElementById("widget"); await window.connectWidget(frame, fixture); frame.srcdoc = html; }, { html, fixture });
  await page.waitForFunction(() => window.widgetReady);
  const frame = page.frameLocator("#widget");
  await frame.getByLabel("Métier", { exact: true }).fill("développeur");
  await frame.getByRole("button", { name: "Rechercher", exact: true }).click();
  await frame.getByRole("button", { name: "Adapter mon CV à cette offre" }).click();
  await page.waitForFunction(() => window.events.some((e) => e.kind === "message"));
  assert.equal(await page.evaluate(() => window.events[0].params.name), "search_jobs");
  const documentResult = { structuredContent: { kind: "documents", application: { cv: { identity: { full_name: "Alice Exemple" } } } }, _meta: { files: [{ filename: "cv-adapte.pdf", mime: "application/pdf", base64: Buffer.from("%PDF-1.4").toString("base64") }] } };
  await page.evaluate(async (result) => { await window.widgetBridge.sendToolInput({ arguments: {} }); await window.widgetBridge.sendToolResult(result); }, documentResult);
  await frame.getByRole("link", { name: "cv-adapte.pdf", exact: true }).click();
  await page.waitForFunction(() => window.events.some((e) => e.kind === "download"));
  assert.equal(await page.evaluate(() => window.events.find((e) => e.kind === "download").params.contents[0].resource.mimeType), "application/pdf");
  const legacy = await browser.newPage();
  await legacy.evaluate((fixture) => { window.events = []; window.openai = { toolOutput: fixture.structuredContent, callTool: async (name, args) => { window.events.push({ kind: "tool", name, args }); return fixture; }, sendFollowUpMessage: async ({ prompt }) => { window.events.push({ kind: "message", prompt }); } }; }, fixture);
  await legacy.setContent(html);
  await legacy.getByRole("button", { name: "Adapter mon CV à cette offre" }).click();
  assert.match(await legacy.evaluate(() => window.events[0].prompt), /Développeuse TypeScript/);
  await legacy.getByLabel("Métier", { exact: true }).fill("développeur");
  await legacy.getByRole("button", { name: "Rechercher", exact: true }).click();
  await legacy.waitForFunction(() => window.events.some((e) => e.kind === "tool"));
  console.log("Widget smoke passed: MCP Apps host handshake, search tool, follow-up message, host-mediated PDF download, and ChatGPT window.openai compatibility.");
} catch (error) { console.error(String(error.message).split("\n")[0].slice(0, 400)); process.exitCode = 1; }
finally { await browser.close(); }
