import type { APIRoute } from 'astro';
import { publishedPosts } from '../data/content';
export const GET: APIRoute = async () =>
  new Response(
    JSON.stringify(
      (await publishedPosts()).map((p) => ({
        id: p.data.id,
        title: p.data.title,
        date: p.data.date,
        tags: p.data.tags,
        summary: p.data.summary,
        url: '/blog/' + p.data.id + '/',
      })),
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
