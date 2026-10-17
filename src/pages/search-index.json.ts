import type { APIRoute } from 'astro';
import { publishedPosts } from '../data/content';
import { postSlug } from '../i18n';
export const GET: APIRoute = async () =>
  new Response(
    JSON.stringify(
      (await publishedPosts('zh')).map((p) => ({
        id: p.data.id,
        title: p.data.title,
        date: p.data.date,
        tags: p.data.tags,
        summary: p.data.summary,
        url: '/blog/' + postSlug(p) + '/',
      })),
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
