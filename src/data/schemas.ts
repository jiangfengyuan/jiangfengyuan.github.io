import { z } from 'astro/zod';
const localized = z.object({ zh: z.string().min(1), en: z.string().min(1) });
const link = z
  .string()
  .refine(
    (value) =>
      value === '' ||
      /^https?:\/\//.test(value) ||
      /^(\/?[A-Za-z0-9._-]+[\w./#?=&%-]*|\/|\.\/)$/u.test(value),
    'Use a local path or an HTTP(S) URL',
  );
export const projectsSchema = z
  .array(
    z.object({
      id: z.enum(['flash', 'republica', 'dhgt']),
      name: z.string().min(1),
      subtitle: localized,
      category: localized,
      description: localized,
      status: localized,
      tags: z.array(z.string()),
      href: link,
      github: link,
      action: link,
      image: z.string().startsWith('/assets/'),
      imageAlt: localized,
      accent: z.enum(['lavender', 'sage', 'rose']),
      source: z.string(),
      sourceDate: z.string(),
      features: z.array(z.object({ title: localized, body: localized })),
    }),
  )
  .refine(
    (items) => new Set(items.map((p) => p.id)).size === 3 && items.length === 3,
    'Keep all three unique project IDs',
  );
export const updatesSchema = z
  .array(
    z.object({
      id: z.string().regex(/^[A-Za-z0-9_-]+$/),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      project: z.enum(['flash', 'republica', 'dhgt', 'website']),
      title: localized,
      body: localized,
      sourceDate: z.string().nullable().optional(),
      links: z.array(z.object({ label: localized, href: link })),
    }),
  )
  .refine(
    (items) => new Set(items.map((u) => u.id)).size === items.length,
    'Update anchors must be unique',
  );
export const profileSchema = z.object({
  name: z.string().min(1),
  role: localized,
  intro: localized,
  description: localized,
  bio: z.array(localized),
  email: z.email(),
  github: z.url(),
  bilibili: z.url(),
  skills: z.array(z.string()),
});
