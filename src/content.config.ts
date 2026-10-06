import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    id: z.string().regex(/^[A-Za-z0-9_-]+$/),
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    publishedAt: z.iso.datetime({ offset: true }).optional(),
    tags: z.array(z.string()).default([]),
    summary: z.string().default(''),
    language: z.enum(['zh', 'en']).default('zh'),
    draft: z.boolean().default(true),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});
export const collections = { posts };
