import "server-only";
import ExcelJS from "exceljs";
import { STATUS, type CandidatureWithOffre, type Status } from "@/lib/db/candidatures";

const COLUMNS = [
  "Date",
  "Entreprise",
  "Poste",
  "Pays",
  "Score",
  "Deadline",
  "Statut",
  "Notes",
  "Contact",
  "URL",
];

export async function candidaturesToXlsx(rows: CandidatureWithOffre[]): Promise<Buffer> {
  const data = rows.map((r) => ({
    Date: r.applied_at?.split(" ")[0] ?? "",
    Entreprise: r.offre_company ?? r.ext_company ?? "",
    Poste: r.offre_title ?? r.ext_title ?? "",
    Pays: r.offre_country ?? r.ext_country ?? "",
    Score: r.offre_score ?? r.ext_score ?? "",
    Deadline: r.deadline ?? "",
    Statut: r.status,
    Notes: r.notes ?? "",
    Contact: r.contact ?? "",
    URL: r.offre_url ?? r.ext_url ?? "",
  }));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Candidatures");
  const widths = [12, 24, 36, 14, 8, 12, 12, 36, 24, 40];
  ws.columns = COLUMNS.map((header, i) => ({ header, key: header, width: widths[i] }));
  ws.addRows(data);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/**
 * Ramène le libellé de statut du fichier importé vers la liste autorisée.
 * Tolère les variantes de casse/accents/espaces ("Envoyée", "En cours") issues d'une
 * édition manuelle dans Excel ; toute valeur inconnue retombe sur "envoyee",
 * le même défaut que celui appliqué aux lignes sans colonne Statut.
 */
function coerceStatus(raw: string): Status {
  const v = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, "_");
  return STATUS.find((s) => s === v) ?? "envoyee";
}

export async function xlsxToCandidatures(buffer: Buffer): Promise<{
  applied_at: string | null;
  ext_company: string | null;
  ext_title: string | null;
  ext_country: string | null;
  ext_score: number | null;
  deadline: string | null;
  status: Status;
  notes: string | null;
  contact: string | null;
  ext_url: string | null;
}[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => { headers[col] = cell.text; });
  const rows: Record<string, string>[] = [];
  ws.eachRow((row, number) => {
    if (number === 1) return;
    const entry: Record<string, string> = {};
    headers.forEach((header, col) => {
      const cell = row.getCell(col);
      entry[header] = cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) : cell.text;
    });
    rows.push(entry);
  });

  const norm = (s: string) => s.toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
  const findKey = (row: any, candidates: string[]): string | undefined => {
    const keys = Object.keys(row);
    for (const c of candidates) {
      const k = keys.find((k) => norm(k).includes(norm(c)));
      if (k) return k;
    }
    return undefined;
  };

  return rows.map((r) => {
    const k = (cands: string[]) => findKey(r, cands);
    const dateK = k(["date"]);
    const compK = k(["entreprise", "company"]);
    const postK = k(["poste", "titre", "title", "job"]);
    const paysK = k(["pays", "country"]);
    const scoreK = k(["score"]);
    const dlK = k(["deadline", "echeance"]);
    const statK = k(["statut", "status"]);
    const notesK = k(["notes", "note"]);
    const contactK = k(["contact"]);
    const urlK = k(["url", "lien", "link"]);

    return {
      applied_at: dateK ? String(r[dateK]) || null : null,
      ext_company: compK ? String(r[compK]) || null : null,
      ext_title: postK ? String(r[postK]) || null : null,
      ext_country: paysK ? String(r[paysK]) || null : null,
      ext_score: scoreK && r[scoreK] !== "" ? Number(r[scoreK]) : null,
      deadline: dlK ? String(r[dlK]) || null : null,
      status: statK ? coerceStatus(String(r[statK])) : "envoyee",
      notes: notesK ? String(r[notesK]) || null : null,
      contact: contactK ? String(r[contactK]) || null : null,
      ext_url: urlK ? String(r[urlK]) || null : null,
    };
  });
}
