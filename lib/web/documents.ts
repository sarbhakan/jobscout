import "server-only";
import { applicationSchema, type Application } from "./schemas";
import { fitCVToOnePage, fitLMToOnePage } from "@/lib/pdf/render";
import { renderCVDocx, renderLMDocx } from "@/lib/docx/render";

export const documentMime = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Stateless rendering: no database, files, model calls, or cross-user cache. */
export async function renderApplication(input: unknown) {
  const app = applicationSchema.parse(input);
  const fitted = await fitCVToOnePage(app.cv, app.language);
  const files = [
    { filename: "cv-adapte.pdf", mime: documentMime.pdf, buffer: fitted.pdf },
    { filename: "cv-adapte.docx", mime: documentMime.docx, buffer: await renderCVDocx(fitted.cv, app.language) },
  ];
  let letter: Application["letter"] = app.letter;
  if (letter) {
    const args = { identity: app.cv.identity, company: app.company, lm: letter, language: app.language };
    const fittedLetter = await fitLMToOnePage(args);
    letter = fittedLetter.lm;
    files.push(
      { filename: "lettre-motivation.pdf", mime: documentMime.pdf, buffer: fittedLetter.pdf },
      { filename: "lettre-motivation.docx", mime: documentMime.docx, buffer: await renderLMDocx({ ...args, lm: letter }) },
    );
  }
  return { application: { ...app, cv: fitted.cv, letter }, files };
}
