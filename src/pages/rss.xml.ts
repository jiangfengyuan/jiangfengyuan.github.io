import rss from '@astrojs/rss';
import { publishedPosts, site } from '../data/content';
export async function GET() {
  return rss({
    title: 'Hayden — Writing & notes',
    description: '作品、赛车与日常的持续记录。',
    site,
    items: (await publishedPosts()).map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: new Date(p.data.publishedAt || p.data.date),
      link: '/blog/' + p.data.id + '/',
    })),
    customData: '<language>zh-CN</language>',
  });
}
