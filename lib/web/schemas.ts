import { z } from "zod";

const text = z.string().trim().max(1200);
const short = z.string().trim().max(250);
const nullable = short.nullable().default(null);
const bullets = z.array(text).max(6).default([]);

export const jobSchema = z.object({
  id: short,
  title: short.min(1),
  company: short.default(""),
  location: short.default(""),
  country: short.default("France"),
  contract: short.default(""),
  description: z.string().max(16000).default(""),
  url: z.string().url().max(2000).refine((s) => new URL(s).protocol === "https:", "Lien HTTPS requis"),
});
export type WebJob = z.infer<typeof jobSchema> & { score?: number; reason?: string };

export const searchSchema = z.object({
  query: short.min(2),
  location: short.default(""),
  country: short.default("France"),
  skills: z.array(short).max(30).default([]),
  limit: z.number().int().min(1).max(12).default(8),
});

export const cvSchema = z.object({
  identity: z.object({
    full_name: short.min(1), email: nullable, phone: nullable, location: nullable,
    linkedin_url: nullable, portfolio_url: nullable,
  }),
  summary: text.default(""),
  sections: z.object({
    experiences: z.array(z.object({
      title: short.min(1), company: nullable, location: nullable,
      start_date: nullable, end_date: nullable, bullet_points: bullets,
    })).max(8).default([]),
    educations: z.array(z.object({
      school: short.min(1), degree: nullable, field: nullable,
      start_date: nullable, end_date: nullable, bullet_points: bullets,
    })).max(5).default([]),
    skills_flat: z.array(short).max(30).default([]),
    languages: z.array(z.object({ name: short, level: nullable })).max(10).default([]),
    projects: z.array(z.object({
      name: short, role: nullable, start_date: nullable, end_date: nullable, bullet_points: bullets,
    })).max(3).default([]),
  }),
});

export const applicationSchema = z.object({
  cv: cvSchema,
  letter: z.object({ object: short.min(1), body_paragraphs: z.array(text.min(1)).min(1).max(4) }).optional(),
  company: short.default(""),
  language: z.enum(["fr", "en"]).default("fr"),
});
export const exportSchema = applicationSchema.extend({
  document: z.enum(["cv", "letter"]).default("cv"),
  format: z.enum(["pdf", "docx"]).default("pdf"),
});
export type Application = z.infer<typeof applicationSchema>;
