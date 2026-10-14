import "server-only";
import { searchSchema, jobSchema, type WebJob } from "./schemas";
import { parseDocument } from "@/lib/scrapers/dom";
import { scoreOffreLocal } from "@/lib/scoring/local";
import { ProfileFullSchema } from "@/lib/cv/types";

export function searchLinks(query: string, location = "") {
  const words = [query, location].filter(Boolean).join(" ");
  return [
    { name: "France Travail", url: `https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(words)}` },
    { name: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}` },
    { name: "Welcome to the Jungle", url: `https://www.welcometothejungle.com/fr/jobs?query=${encodeURIComponent(words)}` },
  ];
}

export function rankJobs(jobs: WebJob[], skills: string[], sector: string, country: string) {
  const profile = ProfileFullSchema.parse({
    sectors: [sector], target_countries: [country],
    skills: skills.map((name) => ({ name, evidence_experience_ids: [] })),
  });
  return jobs.map((job) => {
    const result = scoreOffreLocal(profile, {
      title: job.title, company: job.company, country: job.country,
      description_text: job.description, contract_type: job.contract,
    });
    return { ...job, score: result.score, reason: result.reason };
  }).sort((a, b) => b.score - a.score);
}

export async function searchJobs(input: unknown) {
  const args = searchSchema.parse(input);
  const links = searchLinks(args.query, args.location);
  if (args.country.toLowerCase() !== "france") {
    return { jobs: [], links, status: "unsupported" as const, message: "Le scan intégré couvre la France. Utilisez les liens de recherche pour les autres pays, puis importez une annonce." };
  }
  try {
    const response = await fetch(links[0].url, {
      signal: AbortSignal.timeout(15000), cache: "no-store", redirect: "error",
      headers: { "user-agent": "JobScout/1.0 (job search)", accept: "text/html" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Réponse vide");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 2_000_000) { await reader.cancel(); throw new Error("Page trop volumineuse"); }
      chunks.push(value);
    }
    const doc = parseDocument(Buffer.concat(chunks).toString("utf8"));
    const jobs: WebJob[] = [];
    for (const card of Array.from(doc.querySelectorAll("li[data-id-offre]"))) {
      const id = card.getAttribute("data-id-offre") ?? "";
      const title = card.querySelector("h2, .t4")?.textContent?.trim() ?? "";
      if (!/^[a-z0-9]+$/i.test(id) || !title) continue;
      const parts = (card.querySelector(".subtext")?.textContent ?? "").replace(/\s+/g, " ").split(/\s+-\s+/);
      jobs.push(jobSchema.parse({
        id, title: title.slice(0, 250), company: (parts[0] ?? "").trim().slice(0, 250),
        location: (parts.slice(1).join(" · ") || args.location).slice(0, 250),
        country: "France", contract: (card.querySelector("dd")?.textContent ?? "").trim().slice(0, 250),
        description: (card.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 16000),
        url: `https://candidat.francetravail.fr/offres/recherche/detail/${id}`,
      }));
      if (jobs.length >= args.limit) break;
    }
    if (!jobs.length) return { jobs: [], links, status: "empty" as const, message: "Aucune offre récupérée : la source peut être vide ou bloquer la lecture automatisée. Ouvrez la recherche ou importez une annonce." };
    return { jobs: rankJobs(jobs, args.skills, args.query, args.country), links, status: "ok" as const, message: "Offres publiques France Travail. Les scores utilisent les extraits disponibles ; consultez l'annonce complète." };
  } catch {
    return { jobs: [], links, status: "unavailable" as const, message: "France Travail est inaccessible depuis ce serveur. Vous pouvez ouvrir la recherche et importer une annonce pour continuer." };
  }
}
